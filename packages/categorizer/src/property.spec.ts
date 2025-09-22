import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  mapCategorySlugToId,
  getCategoryBySlug,
  buildCategorizationPrompt,
  getActiveTaxonomy,
  isValidCategorySlug,
  getCategoryIdWithGuardrails
} from './index.js';
import type { NormalizedTransaction } from '@nexus/types';

const createTransactionArbitrary = () => fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  orgId: fc.string({ minLength: 1, maxLength: 50 }),
  date: fc.date().map(d => d.toISOString().split('T')[0]),
  amountCents: fc.integer({ min: -1000000, max: 1000000 }).map(String),
  currency: fc.constant('USD'),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  merchantName: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  mcc: fc.option(fc.string({ minLength: 4, maxLength: 4 })),
  categoryId: fc.option(fc.string()),
  confidence: fc.option(fc.float({ min: 0, max: 1 })),
  reviewed: fc.boolean(),
  source: fc.constantFrom('plaid', 'square', 'manual'),
  raw: fc.constant({})
}) as fc.Arbitrary<NormalizedTransaction>;

describe('property-based tests', () => {
  describe('mapCategorySlugToId', () => {
    test('always returns a valid UUID for any input', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (slug) => {
            const result = mapCategorySlugToId(slug);
            // Should always return a valid UUID format
            expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          }
        )
      );
    });

    test('is deterministic - same input always produces same output', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (slug) => {
            const result1 = mapCategorySlugToId(slug);
            const result2 = mapCategorySlugToId(slug);
            expect(result1).toBe(result2);
          }
        )
      );
    });

    test('valid category slugs map to their correct IDs', () => {
      const taxonomy = getActiveTaxonomy();
      const validSlugs = taxonomy.map(cat => cat.slug);

      fc.assert(
        fc.property(
          fc.constantFrom(...validSlugs),
          (validSlug) => {
            const mappedId = mapCategorySlugToId(validSlug);
            const category = getCategoryBySlug(validSlug);
            expect(mappedId).toBe(category?.id);
          }
        )
      );
    });
  });

  describe('isValidCategorySlug', () => {
    test('all taxonomy slugs are considered valid', () => {
      const taxonomy = getActiveTaxonomy();
      const validSlugs = taxonomy.filter(cat => cat.includeInPrompt).map(cat => cat.slug);

      fc.assert(
        fc.property(
          fc.constantFrom(...validSlugs),
          (validSlug) => {
            expect(isValidCategorySlug(validSlug)).toBe(true);
          }
        )
      );
    });

    test('random strings are mostly invalid (except for valid slugs)', () => {
      const taxonomy = getActiveTaxonomy();
      const validSlugs = new Set(taxonomy.filter(cat => cat.includeInPrompt).map(cat => cat.slug));

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !validSlugs.has(s)),
          (randomString) => {
            expect(isValidCategorySlug(randomString)).toBe(false);
          }
        )
      );
    });
  });

  describe('buildCategorizationPrompt', () => {
    test('always returns a non-empty string for any transaction', () => {
      fc.assert(
        fc.property(
          createTransactionArbitrary(),
          (transaction) => {
            const prompt = buildCategorizationPrompt(transaction);
            expect(prompt.length).toBeGreaterThan(0);
            expect(typeof prompt).toBe('string');
          }
        )
      );
    });

    test('includes transaction details in the prompt', () => {
      fc.assert(
        fc.property(
          createTransactionArbitrary(),
          (transaction) => {
            const prompt = buildCategorizationPrompt(transaction);

            // Should include merchant name if provided
            if (transaction.merchantName) {
              expect(prompt).toContain(transaction.merchantName);
            }

            // Should include description
            expect(prompt).toContain(transaction.description);

            // Should include amount formatting
            const amountInDollars = (parseInt(transaction.amountCents, 10) / 100).toFixed(2);
            expect(prompt).toContain(amountInDollars);
          }
        )
      );
    });

    test('prompt length is reasonable (not too short, not excessively long)', () => {
      fc.assert(
        fc.property(
          createTransactionArbitrary(),
          (transaction) => {
            const prompt = buildCategorizationPrompt(transaction);
            // Should be substantial but not excessive
            expect(prompt.length).toBeGreaterThan(200);
            expect(prompt.length).toBeLessThan(5000);
          }
        )
      );
    });

    test('including prior category name increases prompt length', () => {
      fc.assert(
        fc.property(
          createTransactionArbitrary(),
          fc.string({ minLength: 1, maxLength: 50 }),
          (transaction, priorCategory) => {
            const basePrompt = buildCategorizationPrompt(transaction);
            const promptWithPrior = buildCategorizationPrompt(transaction, priorCategory);

            expect(promptWithPrior.length).toBeGreaterThan(basePrompt.length);
            expect(promptWithPrior).toContain(priorCategory);
          }
        )
      );
    });
  });

  describe('applyEcommerceGuardrails', () => {
    test('confidence never goes below 0 or above 1', () => {
      fc.assert(
        fc.property(
          createTransactionArbitrary(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.oneof(
            fc.float({ min: -2, max: 2 }), // Normal range including negatives
            fc.constant(Number.NaN), // Test NaN handling
            fc.constant(Number.POSITIVE_INFINITY),
            fc.constant(Number.NEGATIVE_INFINITY)
          ),
          (transaction, categorySlug, confidence) => {
            const result = getCategoryIdWithGuardrails(transaction, categorySlug, confidence);

            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(Number.isFinite(result.confidence)).toBe(true); // Ensure no NaN or Infinity
          }
        )
      );
    });

    test('always returns a valid category ID', () => {
      fc.assert(
        fc.property(
          createTransactionArbitrary(),
          fc.string(),
          fc.float({ min: 0, max: 1 }),
          (transaction, categorySlug, confidence) => {
            const result = getCategoryIdWithGuardrails(transaction, categorySlug, confidence);

            // Should always return a valid UUID format
            expect(result.categoryId).toBeDefined();
            expect(result.categoryId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          }
        )
      );
    });

    test('violations array and guardrailsApplied array have consistent lengths', () => {
      fc.assert(
        fc.property(
          createTransactionArbitrary(),
          fc.string(),
          fc.float({ min: 0, max: 1 }),
          (transaction, categorySlug, confidence) => {
            const result = getCategoryIdWithGuardrails(transaction, categorySlug, confidence);

            // If there are violations, there should be guardrails applied
            if (result.violations.length > 0) {
              expect(result.guardrailsApplied.length).toBeGreaterThan(0);
            }
          }
        )
      );
    });

    test('refund transactions never map to positive revenue categories', () => {
      const refundKeywords = ['refund', 'return', 'chargeback', 'reversal'];

      fc.assert(
        fc.property(
          createTransactionArbitrary(),
          fc.constantFrom(...refundKeywords),
          (transaction, refundKeyword) => {
            const refundTransaction = {
              ...transaction,
              description: `${refundKeyword.toUpperCase()} FOR ORDER #12345`,
              amountCents: '-' + Math.abs(parseInt(transaction.amountCents, 10)).toString()
            };

            const result = getCategoryIdWithGuardrails(refundTransaction, 'dtc_sales', 0.9);

            // Should not map to DTC sales
            const dtcSalesId = '550e8400-e29b-41d4-a716-446655440101';
            expect(result.categoryId).not.toBe(dtcSalesId);

            // Should have violations
            expect(result.violations.length).toBeGreaterThan(0);
            expect(result.violations.some(v => v.includes('Refund/return cannot map to positive revenue'))).toBe(true);
          }
        )
      );
    });

    test('payment processors never map to revenue categories when detected', () => {
      const paymentProcessors = ['stripe', 'paypal', 'square', 'shopify payments', 'afterpay'];

      fc.assert(
        fc.property(
          fc.constantFrom(...paymentProcessors),
          (processor) => {
            // Create a transaction that will definitely trigger payment processor detection
            const processorTransaction = {
              id: 'tx-123' as any,
              orgId: 'org-456' as any,
              date: '2024-01-15',
              amountCents: '2500',
              currency: 'USD' as const,
              description: `${processor.toUpperCase()} PAYMENT FEE`,
              merchantName: processor, // Ensure processor is detected
              mcc: undefined,
              categoryId: undefined,
              confidence: undefined,
              reviewed: false,
              needsReview: false,
              source: 'plaid' as const,
              raw: {}
            };

            const result = getCategoryIdWithGuardrails(processorTransaction, 'dtc_sales', 0.9);

            // Should not map to DTC sales when targeting revenue
            const dtcSalesId = '550e8400-e29b-41d4-a716-446655440101';
            expect(result.categoryId).not.toBe(dtcSalesId);

            // When targeting revenue categories, should have violations
            expect(result.violations.length).toBeGreaterThan(0);
            expect(result.violations.some(v => v.includes('Payment processor cannot map to revenue'))).toBe(true);

            // Should map to payment processing fees
            const paymentProcessingFeesId = '550e8400-e29b-41d4-a716-446655440301';
            expect(result.categoryId).toBe(paymentProcessingFeesId);
          }
        )
      );
    });
  });

  describe('taxonomy invariants', () => {
    test('all category IDs are unique', () => {
      const taxonomy = getActiveTaxonomy();
      const ids = taxonomy.map(cat => cat.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    test('all category slugs are unique', () => {
      const taxonomy = getActiveTaxonomy();
      const slugs = taxonomy.map(cat => cat.slug);
      const uniqueSlugs = new Set(slugs);

      expect(slugs.length).toBe(uniqueSlugs.size);
    });

    test('parent references are valid', () => {
      const taxonomy = getActiveTaxonomy();
      const allIds = new Set(taxonomy.map(cat => cat.id));

      for (const category of taxonomy) {
        if (category.parentId) {
          expect(allIds.has(category.parentId)).toBe(true);
        }
      }
    });

    test('non-P&L categories are not included in prompts', () => {
      const taxonomy = getActiveTaxonomy();
      const nonPnLInPrompt = taxonomy.filter(cat => !cat.isPnL && cat.includeInPrompt);

      expect(nonPnLInPrompt.length).toBe(0);
    });
  });
});