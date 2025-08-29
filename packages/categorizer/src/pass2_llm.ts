import type { NormalizedTransaction, CategorizationContext } from '@nexus/types';

interface LLMResponse {
  category_slug: string;
  confidence: number;
  rationale: string;
}

// Currently unused but kept for future implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CategoryMapping {
  id: string;
  name: string;
  slug: string;
}

// Salon-specific category mappings for LLM responses
const CATEGORY_MAPPINGS: Record<string, string> = {
  // Revenue categories
  'hair_services': '550e8400-e29b-41d4-a716-446655440002',
  'nail_services': '550e8400-e29b-41d4-a716-446655440003', 
  'skin_care': '550e8400-e29b-41d4-a716-446655440004',
  'massage': '550e8400-e29b-41d4-a716-446655440005',
  'product_sales': '550e8400-e29b-41d4-a716-446655440006',
  'gift_cards': '550e8400-e29b-41d4-a716-446655440007',
  
  // Expense categories
  'rent_utilities': '550e8400-e29b-41d4-a716-446655440011',
  'supplies': '550e8400-e29b-41d4-a716-446655440012',
  'equipment': '550e8400-e29b-41d4-a716-446655440013',
  'staff_wages': '550e8400-e29b-41d4-a716-446655440014',
  'marketing': '550e8400-e29b-41d4-a716-446655440015',
  'professional_services': '550e8400-e29b-41d4-a716-446655440016',
  'insurance': '550e8400-e29b-41d4-a716-446655440017',
  'licenses': '550e8400-e29b-41d4-a716-446655440018',
  'training': '550e8400-e29b-41d4-a716-446655440019',
  'software': '550e8400-e29b-41d4-a716-446655440020',
  'bank_fees': '550e8400-e29b-41d4-a716-446655440021',
  'travel': '550e8400-e29b-41d4-a716-446655440022',
  'office_supplies': '550e8400-e29b-41d4-a716-446655440023',
  'other_expenses': '550e8400-e29b-41d4-a716-446655440024',
};

/**
 * Builds a compact categorization prompt for the LLM
 */
function buildCategorizationPrompt(
  tx: NormalizedTransaction,
  priorCategoryName?: string
): string {
  // Trim description to 160 chars as specified in requirements
  const trimmedDescription = tx.description.length > 160 
    ? tx.description.substring(0, 157) + '...'
    : tx.description;

  const prompt = `Categorize this business transaction for a salon:

Transaction Details:
- Merchant: ${tx.merchantName || 'Unknown'}
- Description: ${trimmedDescription}
- Amount: $${(parseInt(tx.amountCents) / 100).toFixed(2)}
- MCC: ${tx.mcc || 'Not provided'}
- Industry: salon
${priorCategoryName ? `- Prior category: ${priorCategoryName}` : ''}

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

  return prompt;
}

/**
 * Parses and validates LLM response
 */
function parseLLMResponse(responseText: string): LLMResponse {
  try {
    const response = JSON.parse(responseText.trim());
    
    return {
      category_slug: response.category_slug || 'other_expenses',
      confidence: Math.max(0, Math.min(1, response.confidence || 0.5)),
      rationale: response.rationale || 'LLM categorization'
    };
  } catch {
    // Fallback for malformed responses
    return {
      category_slug: 'other_expenses',
      confidence: 0.5,
      rationale: 'Failed to parse LLM response'
    };
  }
}

/**
 * Maps category slug to database category ID
 */
function mapCategorySlugToId(slug: string): string {
  return CATEGORY_MAPPINGS[slug] || '550e8400-e29b-41d4-a716-446655440024'; // Default to "Other Operating Expenses"
}

/**
 * Pass-2 LLM scoring for transactions that need additional analysis
 * Only runs if Pass-1 confidence < 0.85
 */
export async function scoreWithLLM(
  tx: NormalizedTransaction,
  ctx: CategorizationContext & {
    db: any;
    analytics?: any;
    logger?: any;
    config?: {
      openaiApiKey?: string;
      model?: string;
    };
  }
): Promise<{ categoryId: string; confidence: number; rationale: string[] }> {
  const rationale: string[] = [];
  
  try {
    // Import Langfuse for tracing (server-side only)
    // Note: This is simplified for initial implementation
    const createGeneration = (options: any) => ({
      end: (result: any) => console.log('Langfuse trace:', options, result)
    });
    
    // Get prior category name if it exists
    let priorCategoryName: string | undefined;
    if (tx.categoryId) {
      const { data: category } = await ctx.db
        .from('categories')
        .select('name')
        .eq('id', tx.categoryId)
        .single();
      
      priorCategoryName = category?.name;
    }

    // Build the prompt
    const prompt = buildCategorizationPrompt(tx, priorCategoryName);
    
    // Start Langfuse trace
    const generation = createGeneration({
      name: 'transaction-categorization',
      model: ctx.config?.model || 'gpt-4o-mini',
      input: { prompt, transaction_id: tx.id },
      metadata: {
        org_id: ctx.orgId,
        merchant: tx.merchantName,
        amount: tx.amountCents,
        mcc: tx.mcc
      }
    });

    const startTime = Date.now();

    // Make OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ctx.config?.openaiApiKey || process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: ctx.config?.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial categorization expert for salon businesses. Always respond with valid JSON only.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const llmResponse = data.choices?.[0]?.message?.content || '{}';
    
    // Parse the response
    const parsed = parseLLMResponse(llmResponse);
    const categoryId = mapCategorySlugToId(parsed.category_slug);

    // Update Langfuse trace
    generation.end({
      output: parsed,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      }
    });

    rationale.push(`LLM: ${parsed.rationale}`);
    rationale.push(`Model: ${ctx.config?.model || 'gpt-4o-mini'} (${latency}ms)`);

    // Log success metrics
    ctx.analytics?.captureEvent?.('categorization_llm_success', {
      org_id: ctx.orgId,
      transaction_id: tx.id,
      model: ctx.config?.model || 'gpt-4o-mini',
      confidence: parsed.confidence,
      latency,
      tokens: data.usage?.total_tokens
    });

    return {
      categoryId,
      confidence: parsed.confidence,
      rationale
    };

  } catch (error) {
    // Log error to Sentry and analytics
    ctx.logger?.error('LLM scoring error', error);
    ctx.analytics?.captureException?.(error);
    ctx.analytics?.captureEvent?.('categorization_llm_error', {
      org_id: ctx.orgId,
      transaction_id: tx.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Fallback to a default category
    rationale.push('LLM categorization failed, using fallback');
    
    return {
      categoryId: '550e8400-e29b-41d4-a716-446655440024', // Other Operating Expenses
      confidence: 0.5,
      rationale
    };
  }
}