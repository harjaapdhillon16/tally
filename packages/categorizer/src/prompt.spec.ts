import { describe, test, expect } from 'vitest';
import {
  buildCategorizationPrompt,
  getAvailableCategorySlugs,
  isValidCategorySlug
} from './prompt.js';

const mockTransaction = {
  id: 'tx-123' as any,
  orgId: 'org-456' as any,
  date: '2024-01-15',
  amountCents: '2500',
  currency: 'USD',
  description: 'STRIPE PAYMENT PROCESSING FEE',
  merchantName: 'Stripe',
  mcc: '6012',
  categoryId: undefined,
  confidence: undefined,
  reviewed: false,
  needsReview: false,
  source: 'plaid' as const,
  raw: {}
};

describe('prompt', () => {
  describe('buildCategorizationPrompt', () => {
    test('builds basic e-commerce prompt', () => {
      const prompt = buildCategorizationPrompt(mockTransaction);

      expect(prompt).toContain('e-commerce businesses');
      expect(prompt).toContain('STRIPE PAYMENT PROCESSING FEE');
      expect(prompt).toContain('Stripe');
      expect(prompt).toContain('$25.00');
      expect(prompt).toContain('6012');
      expect(prompt).toContain('Industry: ecommerce');
    });

    test('includes prior category when provided', () => {
      const prompt = buildCategorizationPrompt(mockTransaction, 'Other Expenses');

      expect(prompt).toContain('Prior category: Other Expenses');
    });

    test('trims long descriptions to 160 characters', () => {
      const longDescription = 'A'.repeat(200);
      const longTx = { ...mockTransaction, description: longDescription };

      const prompt = buildCategorizationPrompt(longTx);

      // Should contain trimmed version with ellipsis
      expect(prompt).toContain('A'.repeat(157) + '...');
      expect(prompt).not.toContain('A'.repeat(160));
    });

    test('handles missing optional fields gracefully', () => {
      const minimalTx = {
        ...mockTransaction,
        merchantName: undefined,
        mcc: undefined
      };

      const prompt = buildCategorizationPrompt(minimalTx);

      expect(prompt).toContain('Unknown');
      expect(prompt).toContain('Not provided');
    });

    test('includes e-commerce specific categories', () => {
      const prompt = buildCategorizationPrompt(mockTransaction);

      // Revenue categories
      expect(prompt).toContain('dtc_sales');
      expect(prompt).toContain('shipping_income');

      // COGS categories
      expect(prompt).toContain('inventory_purchases');
      expect(prompt).toContain('packaging_supplies');

      // Expense categories
      expect(prompt).toContain('stripe_fees');
      expect(prompt).toContain('shopify_platform');
      expect(prompt).toContain('ads_meta');
    });

    test('excludes non-prompt categories', () => {
      const prompt = buildCategorizationPrompt(mockTransaction);

      // Should not include clearing accounts
      expect(prompt).not.toContain('shopify_payouts_clearing');

      // Should not include liability accounts
      expect(prompt).not.toContain('sales_tax_payable');

      // Should not include post-MVP categories
      expect(prompt).not.toContain('amazon_fees');
    });

    test('includes e-commerce specific guardrail rules', () => {
      const prompt = buildCategorizationPrompt(mockTransaction);

      expect(prompt).toContain('Refunds/returns must not map to revenue');
      expect(prompt).toContain('Payment processors');
      expect(prompt).toContain('must not map to revenue');
    });

    test('sets proper confidence example', () => {
      const prompt = buildCategorizationPrompt(mockTransaction);

      expect(prompt).toContain('"confidence": 0.95');
    });
  });

  describe('getAvailableCategorySlugs', () => {
    test('returns all prompt-included category slugs', () => {
      const slugs = getAvailableCategorySlugs();

      expect(slugs).toContain('dtc_sales');
      expect(slugs).toContain('stripe_fees');
      expect(slugs).toContain('inventory_purchases');
      expect(slugs.length).toBeGreaterThan(20);
    });

    test('excludes non-prompt categories', () => {
      const slugs = getAvailableCategorySlugs();

      expect(slugs).not.toContain('shopify_payouts_clearing');
      expect(slugs).not.toContain('sales_tax_payable');
      expect(slugs).not.toContain('amazon_fees');
      expect(slugs).not.toContain('revenue'); // parent category
    });
  });

  describe('isValidCategorySlug', () => {
    test('validates correct category slugs', () => {
      expect(isValidCategorySlug('dtc_sales')).toBe(true);
      expect(isValidCategorySlug('stripe_fees')).toBe(true);
      expect(isValidCategorySlug('inventory_purchases')).toBe(true);
    });

    test('rejects invalid category slugs', () => {
      expect(isValidCategorySlug('invalid_category')).toBe(false);
      expect(isValidCategorySlug('salon_services')).toBe(false);
      expect(isValidCategorySlug('')).toBe(false);
    });

    test('rejects non-prompt categories', () => {
      expect(isValidCategorySlug('shopify_payouts_clearing')).toBe(false);
      expect(isValidCategorySlug('sales_tax_payable')).toBe(false);
      expect(isValidCategorySlug('amazon_fees')).toBe(false);
    });
  });
});