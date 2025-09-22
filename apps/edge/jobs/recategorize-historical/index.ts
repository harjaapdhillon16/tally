import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RecategorizationRequest {
  orgId: string;
  daysBack?: number; // Default: 180 days
  batchSize?: number; // Default: 50 transactions per batch
}

interface RecategorizationResult {
  orgId: string;
  processed: number;
  recategorized: number;
  markedForReview: number;
  errors: string[];
  duration: number;
}

const DEFAULT_DAYS_BACK = 180;
const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json() as RecategorizationRequest;
    const { orgId, daysBack = DEFAULT_DAYS_BACK, batchSize = DEFAULT_BATCH_SIZE } = body;

    if (!orgId) {
      return new Response(JSON.stringify({ error: 'orgId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const startTime = Date.now();
    const result = await recategorizeHistoricalTransactions(
      supabase,
      orgId,
      Math.min(batchSize, MAX_BATCH_SIZE),
      daysBack
    );

    result.duration = Date.now() - startTime;

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Recategorization job error:', error);
    return new Response(JSON.stringify({
      error: 'Recategorization job failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

interface BatchTransaction {
  id: string;
  description: string;
  merchant_name: string;
  mcc: string;
  amount_cents: string;
  category_id: string | null;
  confidence: number | null;
  date: string;
  source: string;
  raw: any;
}

async function processSingleTransaction(
  supabase: any,
  tx: BatchTransaction,
  orgId: string
): Promise<{
  categoryChanged: boolean;
  finalResult: any;
  source: 'pass1' | 'llm';
  originalCategoryId: string | null;
}> {
  // Store original category for comparison
  const originalCategoryId = tx.category_id;

  // Run hybrid categorization on this transaction
  const pass1Result = await runPass1Categorization(supabase, tx, orgId);

  let finalResult = pass1Result;
  let source: 'pass1' | 'llm' = 'pass1';

  // If Pass-1 confidence < 0.95, try LLM scoring
  if (!pass1Result.confidence || pass1Result.confidence < 0.95) {
    try {
      const llmResult = await runLLMCategorization(supabase, tx, orgId);
      if (llmResult.confidence && llmResult.confidence > (pass1Result.confidence || 0)) {
        finalResult = llmResult;
        source = 'llm';
      }
    } catch (llmError) {
      console.error(`LLM categorization failed for tx ${tx.id}:`, llmError);
      // Continue with Pass-1 result
    }
  }

  // Check if category changed
  const categoryChanged = originalCategoryId !== finalResult.categoryId;

  return {
    categoryChanged,
    finalResult,
    source,
    originalCategoryId
  };
}

async function updateTransactionRecord(
  supabase: any,
  tx: BatchTransaction,
  orgId: string,
  finalResult: any,
  source: 'pass1' | 'llm',
  originalCategoryId: string | null
): Promise<void> {
  // Always mark changed categories for review
  const { error: updateError } = await supabase
    .from('transactions')
    .update({
      category_id: finalResult.categoryId,
      confidence: finalResult.confidence,
      needs_review: true, // Always mark for review when recategorizing
      reviewed: false
    })
    .eq('id', tx.id);

  if (updateError) {
    throw new Error(`Failed to update transaction ${tx.id}: ${updateError.message}`);
  }

  // Create decision audit record
  const { error: decisionError } = await supabase
    .from('decisions')
    .insert({
      tx_id: tx.id,
      org_id: orgId,
      category_id: finalResult.categoryId,
      confidence: finalResult.confidence || 0,
      source: `recategorization_${source}`,
      rationale: [
        'Historical recategorization due to industry switch',
        `Previous category: ${originalCategoryId || 'none'}`,
        ...(finalResult.rationale || [])
      ],
      decided_by: 'system'
    });

  if (decisionError) {
    console.error('Failed to create decision record:', decisionError);
    // Don't fail the whole process for audit failures
  }
}

async function processBatch(
  supabase: any,
  batch: BatchTransaction[],
  orgId: string,
  result: RecategorizationResult
): Promise<void> {
  for (const tx of batch) {
    try {
      const { categoryChanged, finalResult, source, originalCategoryId } =
        await processSingleTransaction(supabase, tx, orgId);

      if (categoryChanged) {
        await updateTransactionRecord(supabase, tx, orgId, finalResult, source, originalCategoryId);
        result.recategorized++;
        result.markedForReview++;
      }

      result.processed++;

    } catch (error) {
      result.errors.push(`Transaction ${tx.id}: ${error.message}`);
      console.error(`Failed to recategorize transaction ${tx.id}:`, error);
    }
  }
}

async function recategorizeHistoricalTransactions(
  supabase: any,
  orgId: string,
  batchSize: number,
  daysBack: number
): Promise<RecategorizationResult> {
  const result: RecategorizationResult = {
    orgId,
    processed: 0,
    recategorized: 0,
    markedForReview: 0,
    errors: [],
    duration: 0
  };

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  try {
    // Get all transactions from the last X days for this org
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description, merchant_name, mcc, amount_cents, category_id, confidence, date, source, raw')
      .eq('org_id', orgId)
      .gte('date', cutoffDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch transactions: ${fetchError.message}`);
    }

    if (!transactions || transactions.length === 0) {
      console.log(`No transactions found for org ${orgId} in the last ${daysBack} days`);
      return result;
    }

    console.log(`Found ${transactions.length} transactions to recategorize for org ${orgId}`);

    // Process transactions in batches
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      await processBatch(supabase, batch, orgId, result);

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Create activity log entry for this recategorization
    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert({
        org_id: orgId,
        activity_type: 'recategorization_completed',
        description: `Historical recategorization completed: ${result.recategorized} transactions recategorized, ${result.markedForReview} marked for review`,
        metadata: {
          processed: result.processed,
          recategorized: result.recategorized,
          markedForReview: result.markedForReview,
          daysBack,
          duration: result.duration
        },
        created_by: 'system'
      });

    if (activityError) {
      console.error('Failed to create activity log:', activityError);
    }

  } catch (error) {
    result.errors.push(`Recategorization failed: ${error.message}`);
    throw error;
  }

  return result;
}

// Simplified Pass-1 categorization for edge function
async function runPass1Categorization(supabase: any, tx: any, orgId: string) {
  // This is a simplified version - in production, this would use the full categorizer package
  const rationale: string[] = [];
  let bestCandidate: { categoryId?: string; confidence: number } = { confidence: 0 };

  // Basic MCC mapping for e-commerce
  const mccMappings: Record<string, { categoryId: string; confidence: number; name: string }> = {
    '5734': { categoryId: '550e8400-e29b-41d4-a716-446655440332', confidence: 0.9, name: 'App Subscriptions' },
    '7311': { categoryId: '550e8400-e29b-41d4-a716-446655440302', confidence: 0.9, name: 'Marketing & Advertising' },
    '4215': { categoryId: '550e8400-e29b-41d4-a716-446655440343', confidence: 0.9, name: 'Shipping Expense' },
    '9402': { categoryId: '550e8400-e29b-41d4-a716-446655440343', confidence: 0.9, name: 'Shipping Expense' },
  };

  if (tx.mcc && mccMappings[tx.mcc]) {
    const mapping = mccMappings[tx.mcc];
    bestCandidate = { categoryId: mapping.categoryId, confidence: mapping.confidence };
    rationale.push(`mcc: ${tx.mcc} → ${mapping.name}`);
  }

  // Basic pattern matching
  const description = tx.description?.toLowerCase() || '';
  const merchantName = (tx.merchant_name || '').toLowerCase();

  // Shopify platform
  if (merchantName.includes('shopify') && !description.includes('payout')) {
    bestCandidate = {
      categoryId: '550e8400-e29b-41d4-a716-446655440331',
      confidence: 0.9
    };
    rationale.push('pattern: shopify → Shopify Platform');
  }

  // Payment processors
  if (merchantName.includes('stripe')) {
    bestCandidate = {
      categoryId: '550e8400-e29b-41d4-a716-446655440311',
      confidence: 0.9
    };
    rationale.push('pattern: stripe → Stripe Fees');
  }

  // Shipping
  if (description.includes('shipping') || description.includes('postage')) {
    bestCandidate = {
      categoryId: '550e8400-e29b-41d4-a716-446655440343',
      confidence: 0.8
    };
    rationale.push('pattern: shipping → Shipping Expense');
  }

  // Advertising
  if (description.includes('ads') || description.includes('advertising')) {
    if (merchantName.includes('google')) {
      bestCandidate = {
        categoryId: '550e8400-e29b-41d4-a716-446655440322',
        confidence: 0.9
      };
      rationale.push('pattern: google ads → Google Ads');
    } else if (merchantName.includes('facebook') || merchantName.includes('meta')) {
      bestCandidate = {
        categoryId: '550e8400-e29b-41d4-a716-446655440321',
        confidence: 0.9
      };
      rationale.push('pattern: meta ads → Meta Ads');
    } else {
      bestCandidate = {
        categoryId: '550e8400-e29b-41d4-a716-446655440324',
        confidence: 0.8
      };
      rationale.push('pattern: ads → Other Ads');
    }
  }

  return {
    categoryId: bestCandidate.categoryId,
    confidence: bestCandidate.confidence > 0 ? bestCandidate.confidence : undefined,
    rationale
  };
}

// Simplified LLM categorization for recategorization
async function runLLMCategorization(supabase: any, tx: any, orgId: string) {
  // For the recategorization job, we'll use a simpler approach
  // In a full implementation, this would import the full LLM categorization logic

  return {
    categoryId: '550e8400-e29b-41d4-a716-446655440359', // other_ops
    confidence: 0.6,
    rationale: ['Recategorization LLM placeholder']
  };
}