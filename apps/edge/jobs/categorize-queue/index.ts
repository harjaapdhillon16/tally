import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface CategorizationResult {
  categoryId?: string;
  confidence?: number;
  rationale: string[];
}

// Rate limiting constants
const RATE_LIMIT = {
  ORG_CONCURRENCY: 2, // Max concurrent transactions per org
  GLOBAL_CONCURRENCY: 5, // Max global concurrent operations
  BATCH_SIZE: 10, // Transactions to process per batch
};

// Simple in-memory rate limiting
const orgProcessing = new Map<string, number>();
let globalProcessing = 0;

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get transactions that need categorization
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, org_id, merchant_name, mcc, description, amount_cents, category_id, needs_review')
      .or('category_id.is.null,needs_review.eq.true')
      .order('created_at', { ascending: true })
      .limit(RATE_LIMIT.BATCH_SIZE);

    if (error || !transactions) {
      throw new Error(`Failed to fetch transactions: ${error?.message}`);
    }

    if (transactions.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No transactions to process',
        processed: 0 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];
    const orgGroups = new Map<string, typeof transactions>();

    // Group transactions by organization for rate limiting
    for (const tx of transactions) {
      if (!orgGroups.has(tx.org_id)) {
        orgGroups.set(tx.org_id, []);
      }
      orgGroups.get(tx.org_id)!.push(tx);
    }

    // Process each organization's transactions
    for (const [orgId, orgTransactions] of orgGroups) {
      // Check rate limits
      const currentOrgProcessing = orgProcessing.get(orgId) || 0;
      if (currentOrgProcessing >= RATE_LIMIT.ORG_CONCURRENCY) {
        console.log(`Rate limit reached for org ${orgId}, skipping`);
        continue;
      }
      
      if (globalProcessing >= RATE_LIMIT.GLOBAL_CONCURRENCY) {
        console.log('Global rate limit reached, stopping processing');
        break;
      }

      // Update rate limiting counters
      orgProcessing.set(orgId, currentOrgProcessing + 1);
      globalProcessing++;

      try {
        const orgResults = await processOrgTransactions(supabase, orgId, orgTransactions);
        results.push(...orgResults);
      } catch (error) {
        console.error(`Failed to process org ${orgId}:`, error);
        results.push({
          orgId,
          error: error.message,
          processed: 0,
        });
      } finally {
        // Decrement counters
        const newCount = Math.max(0, (orgProcessing.get(orgId) || 1) - 1);
        if (newCount === 0) {
          orgProcessing.delete(orgId);
        } else {
          orgProcessing.set(orgId, newCount);
        }
        globalProcessing = Math.max(0, globalProcessing - 1);
      }
    }

    return new Response(JSON.stringify({
      processed: results.reduce((sum, r) => sum + (r.processed || 0), 0),
      organizations: results.length,
      results
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Categorization queue job error:', error);
    return new Response(JSON.stringify({ 
      error: 'Categorization job failed',
      message: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function processOrgTransactions(supabase: any, orgId: string, transactions: any[]) {
  const results = {
    orgId,
    processed: 0,
    autoApplied: 0,
    markedForReview: 0,
    errors: [] as string[],
  };

  for (const tx of transactions) {
    try {
      // Run Pass-1 categorization
      const pass1Result = await runPass1Categorization(supabase, tx, orgId);
      
      let finalResult = pass1Result;
      let source: 'pass1' | 'llm' = 'pass1';

      // If Pass-1 confidence < 0.85, try LLM scoring
      if (!pass1Result.confidence || pass1Result.confidence < 0.85) {
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

      // Apply decision
      await decideAndApply(supabase, tx.id, finalResult, source, orgId);
      
      results.processed++;
      if (finalResult.confidence && finalResult.confidence >= 0.85) {
        results.autoApplied++;
      } else {
        results.markedForReview++;
      }

    } catch (error) {
      console.error(`Failed to process transaction ${tx.id}:`, error);
      results.errors.push(`${tx.id}: ${error.message}`);
    }
  }

  return results;
}

async function runPass1Categorization(supabase: any, tx: any, orgId: string): Promise<CategorizationResult> {
  // Simplified Pass-1 implementation for edge function
  // In a full implementation, we'd import from the categorizer package
  
  const rationale: string[] = [];
  let bestCandidate: { categoryId?: string; confidence: number } = { confidence: 0 };

  // MCC mapping (simplified)
  const mccMappings: Record<string, { categoryId: string; confidence: number; name: string }> = {
    '7230': { categoryId: '550e8400-e29b-41d4-a716-446655440002', confidence: 0.9, name: 'Hair Services' },
    '7298': { categoryId: '550e8400-e29b-41d4-a716-446655440004', confidence: 0.9, name: 'Skin Care Services' },
    '5912': { categoryId: '550e8400-e29b-41d4-a716-446655440012', confidence: 0.85, name: 'Supplies & Inventory' },
  };

  if (tx.mcc && mccMappings[tx.mcc]) {
    const mapping = mccMappings[tx.mcc];
    bestCandidate = { categoryId: mapping.categoryId, confidence: mapping.confidence };
    rationale.push(`mcc: ${tx.mcc} → ${mapping.name}`);
  }

  // Pattern matching (simplified)
  const description = tx.description?.toLowerCase() || '';
  if (description.includes('rent') || description.includes('lease')) {
    if (0.75 > bestCandidate.confidence) {
      bestCandidate = { 
        categoryId: '550e8400-e29b-41d4-a716-446655440011', 
        confidence: 0.75 
      };
      rationale.push('pattern: rent/lease → Rent & Utilities');
    }
  }

  return {
    categoryId: bestCandidate.categoryId,
    confidence: bestCandidate.confidence > 0 ? bestCandidate.confidence : undefined,
    rationale
  };
}

async function runLLMCategorization(supabase: any, tx: any, orgId: string): Promise<CategorizationResult> {
  // Gemini implementation for edge function
  
  const prompt = `You are a financial categorization expert for salon businesses. Always respond with valid JSON only.

Categorize this salon business transaction:

Transaction Details:
- Merchant: ${tx.merchant_name || 'Unknown'}
- Description: ${tx.description}
- Amount: $${(parseInt(tx.amount_cents) / 100).toFixed(2)}
- Industry: salon

Available categories:
Revenue: hair_services, nail_services, skin_care, massage, product_sales, gift_cards
Expenses: rent_utilities, supplies, equipment, staff_wages, marketing, professional_services, insurance, licenses, training, software, bank_fees, travel, office_supplies, other_expenses

Return JSON only:
{
  "category_slug": "most_appropriate_category",
  "confidence": 0.85,
  "rationale": "Brief explanation of why this category fits"
}

Choose the most specific category that matches. If uncertain, use a broader category with lower confidence.`;

  try {
    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    const parsed = JSON.parse(content);

    // Map category slug to ID (simplified)
    const categoryMappings: Record<string, string> = {
      'supplies': '550e8400-e29b-41d4-a716-446655440012',
      'rent_utilities': '550e8400-e29b-41d4-a716-446655440011',
      'software': '550e8400-e29b-41d4-a716-446655440020',
      'hair_services': '550e8400-e29b-41d4-a716-446655440002',
      'nail_services': '550e8400-e29b-41d4-a716-446655440003',
      'skin_care': '550e8400-e29b-41d4-a716-446655440004',
      'massage': '550e8400-e29b-41d4-a716-446655440005',
      'product_sales': '550e8400-e29b-41d4-a716-446655440006',
      'gift_cards': '550e8400-e29b-41d4-a716-446655440007',
      'equipment': '550e8400-e29b-41d4-a716-446655440013',
      'staff_wages': '550e8400-e29b-41d4-a716-446655440014',
      'marketing': '550e8400-e29b-41d4-a716-446655440015',
      'professional_services': '550e8400-e29b-41d4-a716-446655440016',
      'insurance': '550e8400-e29b-41d4-a716-446655440017',
      'licenses': '550e8400-e29b-41d4-a716-446655440018',
      'training': '550e8400-e29b-41d4-a716-446655440019',
      'bank_fees': '550e8400-e29b-41d4-a716-446655440021',
      'travel': '550e8400-e29b-41d4-a716-446655440022',
      'office_supplies': '550e8400-e29b-41d4-a716-446655440023',
      'other_expenses': '550e8400-e29b-41d4-a716-446655440024',
    };

    return {
      categoryId: categoryMappings[parsed.category_slug] || categoryMappings['other_expenses'],
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
      rationale: [`LLM: ${parsed.rationale || 'AI categorization'}`]
    };

  } catch (error) {
    console.error('Gemini categorization error:', error);
    return {
      categoryId: '550e8400-e29b-41d4-a716-446655440024',
      confidence: 0.5,
      rationale: ['LLM categorization failed, using fallback']
    };
  }
}

async function decideAndApply(
  supabase: any, 
  txId: string, 
  result: CategorizationResult, 
  source: 'pass1' | 'llm', 
  orgId: string
): Promise<void> {
  const shouldAutoApply = result.confidence && result.confidence >= 0.85;

  const updateData: any = {
    reviewed: false,
  };

  if (shouldAutoApply && result.categoryId) {
    updateData.category_id = result.categoryId;
    updateData.confidence = result.confidence;
    updateData.needs_review = false;
  } else {
    updateData.needs_review = true;
    if (result.categoryId) {
      updateData.category_id = result.categoryId;
    }
    if (result.confidence) {
      updateData.confidence = result.confidence;
    }
  }

  // Update transaction
  const { error: updateError } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', txId);

  if (updateError) {
    throw new Error(`Failed to update transaction: ${updateError.message}`);
  }

  // Create decision audit record
  const { error: decisionError } = await supabase
    .from('decisions')
    .insert({
      tx_id: txId,
      source,
      confidence: result.confidence || 0,
      rationale: result.rationale || [],
      decided_by: 'system'
    });

  if (decisionError) {
    console.error('Failed to create decision record:', decisionError);
    // Don't throw - audit failure shouldn't block processing
  }
}