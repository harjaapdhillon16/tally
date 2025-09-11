import type { NormalizedTransaction, CategorizationContext } from '@nexus/types';
import { GeminiClient } from './gemini-client.js';

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

  const prompt = `You are a financial categorization expert for salon businesses. Always respond with valid JSON only.

Categorize this business transaction for a salon:

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
    // First, try to parse as direct JSON
    let cleanText = responseText.trim();
    
    // If the response is wrapped in markdown code blocks, extract the JSON
    const jsonMatch = cleanText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      cleanText = jsonMatch[1].trim();
    } else {
      // Try to extract JSON object from the text
      const objectMatch = cleanText.match(/\{[\s\S]*\}/);
      if (objectMatch && objectMatch[0]) {
        cleanText = objectMatch[0].trim();
      }
    }
    
    const response = JSON.parse(cleanText);
    
    return {
      category_slug: response.category_slug || 'other_expenses',
      confidence: Math.max(0, Math.min(1, response.confidence || 0.5)),
      rationale: response.rationale || 'LLM categorization'
    };
  } catch (error) {
    // Fallback for malformed responses
    console.error('Failed to parse LLM response:', responseText, error);
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
      geminiApiKey?: string;
      model?: string;
    };
  }
): Promise<{ categoryId: string; confidence: number; rationale: string[] }> {
  const rationale: string[] = [];
  
  try {
    // Initialize Gemini client
    const apiKey = ctx.config?.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for LLM categorization');
    }
    
    const geminiClient = new GeminiClient({
      apiKey,
      model: ctx.config?.model || 'gemini-2.5-flash-lite'
    });

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
      model: geminiClient.getModelName(),
      input: { prompt, transaction_id: tx.id },
      metadata: {
        org_id: ctx.orgId,
        merchant: tx.merchantName,
        amount: tx.amountCents,
        mcc: tx.mcc
      }
    });

    const startTime = Date.now();

    // Make Gemini API call
    const response = await geminiClient.generateContent(prompt);
    const latency = Date.now() - startTime;
    
    // Parse the response
    const parsed = parseLLMResponse(response.text);
    const categoryId = mapCategorySlugToId(parsed.category_slug);

    // Update Langfuse trace
    generation.end({
      output: parsed,
      usage: response.usage
    });

    rationale.push(`LLM: ${parsed.rationale}`);
    rationale.push(`Model: ${geminiClient.getModelName()} (${latency}ms)`);

    // Log success metrics
    ctx.analytics?.captureEvent?.('categorization_llm_success', {
      org_id: ctx.orgId,
      transaction_id: tx.id,
      model: geminiClient.getModelName(),
      confidence: parsed.confidence,
      latency,
      tokens: response.usage?.totalTokens
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