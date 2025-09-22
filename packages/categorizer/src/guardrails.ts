import type { NormalizedTransaction } from '@nexus/types';
import { getCategoryBySlug, mapCategorySlugToId } from './taxonomy.js';

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  suggestedCategorySlug?: string;
  confidencePenalty?: number;
}

/**
 * E-commerce specific guardrails to prevent incorrect categorizations
 */

/**
 * Checks if a transaction should be blocked from mapping to revenue categories
 */
export function checkRevenueGuardrails(
  tx: NormalizedTransaction,
  proposedCategorySlug: string
): GuardrailResult {
  const category = getCategoryBySlug(proposedCategorySlug);

  // Only apply to revenue categories
  if (!category || category.type !== 'revenue') {
    return { allowed: true };
  }

  const description = tx.description.toLowerCase();
  const merchantName = (tx.merchantName || '').toLowerCase();

  // Block refunds/returns from mapping to positive revenue
  const refundKeywords = [
    'refund', 'return', 'chargeback', 'reversal', 'void',
    'cancelled', 'dispute', 'adjustment', 'credit'
  ];

  const hasRefundKeywords = refundKeywords.some(keyword =>
    description.includes(keyword) || (merchantName && merchantName.includes(keyword))
  );

  // Check for negative amounts (typically refunds) and refund keywords
  const isNegativeAmount = parseInt(tx.amountCents) < 0;
  const isRefundPattern = hasRefundKeywords || isNegativeAmount;

  if (isRefundPattern && !proposedCategorySlug.includes('contra')) {
    return {
      allowed: false,
      reason: 'Refund/return cannot map to positive revenue',
      suggestedCategorySlug: 'refunds_allowances_contra',
      confidencePenalty: 0.4
    };
  }

  // Block payment processors from mapping to revenue
  const paymentProcessors = [
    'stripe', 'paypal', 'square', 'shopify payments', 'shop pay',
    'afterpay', 'affirm', 'klarna', 'sezzle', 'adyen', 'braintree'
  ];

  const isPaymentProcessor = paymentProcessors.some(processor =>
    (merchantName && merchantName.includes(processor)) || description.includes(processor)
  );

  if (isPaymentProcessor) {
    return {
      allowed: false,
      reason: 'Payment processor cannot map to revenue',
      suggestedCategorySlug: 'payment_processing_fees',
      confidencePenalty: 0.3
    };
  }

  return { allowed: true };
}

/**
 * Checks for sales tax patterns and routes to liability account
 */
export function checkSalesTaxGuardrails(
  tx: NormalizedTransaction,
  proposedCategorySlug: string
): GuardrailResult {
  const description = tx.description.toLowerCase();
  const merchantName = (tx.merchantName || '').toLowerCase();

  const salesTaxKeywords = [
    'sales tax', 'state tax', 'local tax', 'use tax',
    'revenue department', 'tax authority', 'comptroller',
    'department of revenue', 'tax commission'
  ];

  const hasSalesTaxPattern = salesTaxKeywords.some(keyword =>
    description.includes(keyword) || (merchantName && merchantName.includes(keyword))
  );

  // Check for tax authority merchants
  const taxAuthorities = [
    'state of', 'city of', 'county of', 'department of revenue',
    'tax collector', 'revenue service'
  ];

  const isTaxAuthority = taxAuthorities.some(authority =>
    merchantName && merchantName.includes(authority)
  );

  if ((hasSalesTaxPattern || isTaxAuthority) && proposedCategorySlug !== 'sales_tax_payable') {
    return {
      allowed: false,
      reason: 'Sales tax payment should map to liability account',
      suggestedCategorySlug: 'sales_tax_payable',
      confidencePenalty: 0.2
    };
  }

  return { allowed: true };
}

/**
 * Checks for Shopify payout patterns and routes to clearing account
 */
export function checkShopifyPayoutGuardrails(
  tx: NormalizedTransaction,
  proposedCategorySlug: string
): GuardrailResult {
  const description = tx.description.toLowerCase();
  const merchantName = (tx.merchantName || '').toLowerCase();

  const shopifyPayoutKeywords = [
    'shopify payout', 'shopify transfer', 'shopify deposit',
    'shopify payments payout'
  ];

  const isShopifyPayout = shopifyPayoutKeywords.some(keyword =>
    description.includes(keyword) || (merchantName && merchantName.includes(keyword))
  );

  // Also check for Shopify as merchant with payout-like descriptions
  const isShopifyMerchant = merchantName && merchantName.includes('shopify');
  const payoutDescriptions = ['payout', 'transfer', 'deposit', 'settlement'];
  const hasPayoutDescription = payoutDescriptions.some(desc =>
    description.includes(desc)
  );

  if ((isShopifyPayout || (isShopifyMerchant && hasPayoutDescription)) &&
      proposedCategorySlug !== 'shopify_payouts_clearing') {
    return {
      allowed: false,
      reason: 'Shopify payouts should map to clearing account',
      suggestedCategorySlug: 'shopify_payouts_clearing',
      confidencePenalty: 0.1
    };
  }

  return { allowed: true };
}

/**
 * Applies all e-commerce guardrails to a proposed categorization
 */
export function applyEcommerceGuardrails(
  tx: NormalizedTransaction,
  proposedCategorySlug: string,
  confidence: number
): {
  categorySlug: string;
  confidence: number;
  guardrailsApplied: string[];
  violations: string[];
} {
  let finalCategorySlug = proposedCategorySlug;
  let finalConfidence = confidence;
  const guardrailsApplied: string[] = [];
  const violations: string[] = [];

  // Apply revenue guardrails
  const revenueCheck = checkRevenueGuardrails(tx, proposedCategorySlug);
  if (!revenueCheck.allowed) {
    violations.push(revenueCheck.reason!);
    if (revenueCheck.suggestedCategorySlug) {
      finalCategorySlug = revenueCheck.suggestedCategorySlug;
      guardrailsApplied.push('revenue_block');
    }
    if (revenueCheck.confidencePenalty) {
      finalConfidence = Math.max(0, finalConfidence - revenueCheck.confidencePenalty);
    }
  }

  // Apply sales tax guardrails
  const salesTaxCheck = checkSalesTaxGuardrails(tx, finalCategorySlug);
  if (!salesTaxCheck.allowed) {
    violations.push(salesTaxCheck.reason!);
    if (salesTaxCheck.suggestedCategorySlug) {
      finalCategorySlug = salesTaxCheck.suggestedCategorySlug;
      guardrailsApplied.push('sales_tax_redirect');
    }
    if (salesTaxCheck.confidencePenalty) {
      finalConfidence = Math.max(0, finalConfidence - salesTaxCheck.confidencePenalty);
    }
  }

  // Apply Shopify payout guardrails
  const shopifyCheck = checkShopifyPayoutGuardrails(tx, finalCategorySlug);
  if (!shopifyCheck.allowed) {
    violations.push(shopifyCheck.reason!);
    if (shopifyCheck.suggestedCategorySlug) {
      finalCategorySlug = shopifyCheck.suggestedCategorySlug;
      guardrailsApplied.push('shopify_payout_redirect');
    }
    if (shopifyCheck.confidencePenalty) {
      finalConfidence = Math.max(0, finalConfidence - shopifyCheck.confidencePenalty);
    }
  }

  return {
    categorySlug: finalCategorySlug,
    confidence: Math.max(0, Math.min(1, finalConfidence || 0)), // Ensure confidence is between 0 and 1, handle NaN
    guardrailsApplied,
    violations
  };
}

/**
 * Gets the category ID for a slug after applying guardrails
 */
export function getCategoryIdWithGuardrails(
  tx: NormalizedTransaction,
  proposedCategorySlug: string,
  confidence: number
): {
  categoryId: string;
  confidence: number;
  guardrailsApplied: string[];
  violations: string[];
} {
  const result = applyEcommerceGuardrails(tx, proposedCategorySlug, confidence);

  return {
    categoryId: mapCategorySlugToId(result.categorySlug),
    confidence: result.confidence,
    guardrailsApplied: result.guardrailsApplied,
    violations: result.violations
  };
}