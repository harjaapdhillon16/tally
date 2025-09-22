import { describe, test, expect, vi } from 'vitest';
import {
  buildCategorizationPrompt,
  getCategoryIdWithGuardrails,
  getCategorizationConfig,
  ECOMMERCE_TAXONOMY
} from './index.js';
import type { NormalizedTransaction } from '@nexus/types';

const createMockTransaction = (overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction => ({
  id: 'tx-123',
  orgId: 'org-456',
  date: '2024-01-15',
  amountCents: '2500',
  currency: 'USD',
  description: 'Test transaction',
  merchantName: 'Test Merchant',
  mcc: undefined,
  categoryId: undefined,
  confidence: undefined,
  reviewed: false,
  source: 'plaid' as const,
  raw: {},
  ...overrides
});

const createMockDatabase = () => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { industry: 'ecommerce' },
          error: null
        })
      })
    })
  })
});

describe('categorizer integration', () => {
  describe('end-to-end categorization workflow', () => {
    test('handles Shopify ecosystem transaction', async () => {
      const tx = createMockTransaction({
        merchantName: 'Shopify',
        description: 'SHOPIFY SUBSCRIPTION FEE',
        mcc: '5734'
      });

      const prompt = buildCategorizationPrompt(tx);
      expect(prompt).toContain('Shopify');
      expect(prompt).toContain('e-commerce businesses');

      const result = getCategoryIdWithGuardrails(tx, 'shopify_platform', 0.9);
      expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440331');
      expect(result.confidence).toBe(0.9);
      expect(result.guardrailsApplied).toHaveLength(0);
    });

    test('blocks payment processor from revenue with guardrails', async () => {
      const tx = createMockTransaction({
        merchantName: 'Stripe',
        description: 'PAYMENT PROCESSING FEE'
      });

      const result = getCategoryIdWithGuardrails(tx, 'dtc_sales', 0.9);

      expect(result.categoryId).not.toBe('550e8400-e29b-41d4-a716-446655440101'); // dtc_sales
      expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440301'); // payment_processing_fees (correct)
      expect(result.confidence).toBeLessThan(0.9);
      expect(result.guardrailsApplied).toContain('revenue_block');
      expect(result.violations.length).toBeGreaterThan(0);
    });

    test('handles refund transaction with guardrails', async () => {
      const tx = createMockTransaction({
        description: 'REFUND FOR ORDER #12345',
        amountCents: '-2500'
      });

      const result = getCategoryIdWithGuardrails(tx, 'dtc_sales', 0.9);

      expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440104'); // refunds_allowances_contra (updated)
      expect(result.guardrailsApplied).toContain('revenue_block');
      expect(result.violations.some(v => v.includes('Refund/return cannot map to positive revenue'))).toBe(true);
    });

    test('routes sales tax to liability account', async () => {
      const tx = createMockTransaction({
        merchantName: 'State of California',
        description: 'SALES TAX PAYMENT - Q4 2023'
      });

      const result = getCategoryIdWithGuardrails(tx, 'other_ops', 0.8);

      expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440401'); // sales_tax_payable
      expect(result.guardrailsApplied).toContain('sales_tax_redirect');
      expect(result.violations.some(v => v.includes('Sales tax payment should map to liability account'))).toBe(true);
    });

    test('handles Shopify payout correctly', async () => {
      const tx = createMockTransaction({
        merchantName: 'Shopify Payments',
        description: 'SHOPIFY PAYOUT - SALES WEEK OF 01/08',
        amountCents: '145670'
      });

      const result = getCategoryIdWithGuardrails(tx, 'dtc_sales', 0.9);

      expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440501'); // shopify_payouts_clearing (correct)
      expect(result.guardrailsApplied).toContain('shopify_payout_redirect');
    });
  });

  describe('configuration integration', () => {
    test('config affects categorization behavior', async () => {
      const db = createMockDatabase();
      const config = await getCategorizationConfig(db, 'org-123');

      expect(config.industry).toBe('ecommerce');
      expect(config.autoApplyThreshold).toBe(0.95);
      expect(config.hybridThreshold).toBe(0.95);
      expect(config.useGuardrails).toBe(true);
    });
  });

  describe('taxonomy consistency', () => {
    test('all referenced category IDs exist in taxonomy', () => {
      const allCategoryIds = new Set(ECOMMERCE_TAXONOMY.map(cat => cat.id));

      const referencedIds = [
        '550e8400-e29b-41d4-a716-446655440101', // dtc_sales
        '550e8400-e29b-41d4-a716-446655440311', // stripe_fees
        '550e8400-e29b-41d4-a716-446655440331', // shopify_platform
        '550e8400-e29b-41d4-a716-446655440104', // refunds_allowances_contra (corrected)
        '550e8400-e29b-41d4-a716-446655440401', // sales_tax_payable
        '550e8400-e29b-41d4-a716-446655440501', // shopify_payouts_clearing (corrected)
        '550e8400-e29b-41d4-a716-446655440359'  // other_ops
      ];

      for (const id of referencedIds) {
        expect(allCategoryIds.has(id)).toBe(true);
      }
    });

    test('prompt categories are subset of all categories', () => {
      const promptCategories = ECOMMERCE_TAXONOMY.filter(cat => cat.includeInPrompt);
      const allCategories = ECOMMERCE_TAXONOMY;

      expect(promptCategories.length).toBeGreaterThan(20);
      expect(promptCategories.length).toBeLessThan(allCategories.length);

      // All prompt categories should be P&L categories
      const pnlPromptCategories = promptCategories.filter(cat => cat.isPnL);
      expect(pnlPromptCategories.length).toBe(promptCategories.length);
    });
  });

  describe('error handling', () => {
    test('handles invalid category slugs gracefully', () => {
      const tx = createMockTransaction();
      const result = getCategoryIdWithGuardrails(tx, 'invalid_category', 0.9);

      // Should fall back to other_ops
      expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440359');
    });

    test('handles missing transaction fields', () => {
      const tx = createMockTransaction({
        merchantName: undefined,
        mcc: undefined,
        description: ''
      });

      const prompt = buildCategorizationPrompt(tx);
      expect(prompt).toContain('Unknown');
      expect(prompt).toContain('Not provided');
    });
  });
});