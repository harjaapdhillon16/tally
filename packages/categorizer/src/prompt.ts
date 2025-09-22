import type { NormalizedTransaction } from '@nexus/types';
import { getPromptCategories, getCategoriesByType } from './taxonomy.js';

/**
 * Builds a categorization prompt for e-commerce businesses using centralized taxonomy
 */
export function buildCategorizationPrompt(
  tx: NormalizedTransaction,
  priorCategoryName?: string
): string {
  // Trim description to 160 chars as specified in requirements
  const trimmedDescription = tx.description.length > 160
    ? tx.description.substring(0, 157) + '...'
    : tx.description;

  // Get categories organized by type for display
  const revenueCategories = getCategoriesByType('revenue').filter(c => c.includeInPrompt);
  const cogsCategories = getCategoriesByType('cogs').filter(c => c.includeInPrompt);
  const opexCategories = getCategoriesByType('opex').filter(c => c.includeInPrompt);

  // Build category lists for prompt
  const revenueSlugs = revenueCategories.map(c => c.slug).join(', ');
  const cogsSlugs = cogsCategories.map(c => c.slug).join(', ');
  const opexSlugs = opexCategories.map(c => c.slug).join(', ');

  const prompt = `You are a financial categorization expert for e-commerce businesses. Always respond with valid JSON only.

Categorize this business transaction for an e-commerce store:

Transaction Details:
- Merchant: ${tx.merchantName || 'Unknown'}
- Description: ${trimmedDescription}
- Amount: $${(parseInt(tx.amountCents) / 100).toFixed(2)}
- MCC: ${tx.mcc || 'Not provided'}
- Industry: ecommerce
${priorCategoryName ? `- Prior category: ${priorCategoryName}` : ''}

Available categories:
Revenue: ${revenueSlugs}
COGS: ${cogsSlugs}
Expenses: ${opexSlugs}

Return JSON only:
{
  "category_slug": "most_appropriate_category",
  "confidence": 0.95,
  "rationale": "Brief explanation of why this category fits"
}

Rules:
- Refunds/returns must not map to revenue; choose refunds_allowances_contra.
- Payment processors (Stripe, PayPal, Shopify Payments, BNPL) must not map to revenue.
- If uncertain, choose a broader expense category with lower confidence.`;

  return prompt;
}

/**
 * Gets available category slugs for validation
 */
export function getAvailableCategorySlugs(): string[] {
  return getPromptCategories().map(category => category.slug);
}

/**
 * Validates if a category slug is available in the prompt
 */
export function isValidCategorySlug(slug: string): boolean {
  return getAvailableCategorySlugs().includes(slug);
}