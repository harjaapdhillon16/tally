import { describe, test, expect } from 'vitest';
import {
  getActiveTaxonomy,
  getCategoryBySlug,
  getCategoryById,
  isPnLCategory,
  getPromptCategories,
  getCategoriesByType,
  getChildCategories,
  mapCategorySlugToId,
  createSlugToIdMapping,
  ECOMMERCE_TAXONOMY
} from './taxonomy.js';

describe('taxonomy', () => {
  describe('getActiveTaxonomy', () => {
    test('returns ecommerce taxonomy', () => {
      const taxonomy = getActiveTaxonomy();
      expect(taxonomy).toBe(ECOMMERCE_TAXONOMY);
      expect(taxonomy.length).toBeGreaterThan(40);
    });
  });

  describe('getCategoryBySlug', () => {
    test('finds existing category by slug', () => {
      const category = getCategoryBySlug('dtc_sales');
      expect(category).toBeDefined();
      expect(category?.name).toBe('DTC Sales');
      expect(category?.type).toBe('revenue');
    });

    test('returns undefined for non-existent slug', () => {
      const category = getCategoryBySlug('non_existent');
      expect(category).toBeUndefined();
    });
  });

  describe('getCategoryById', () => {
    test('finds existing category by ID', () => {
      const category = getCategoryById('550e8400-e29b-41d4-a716-446655440101');
      expect(category).toBeDefined();
      expect(category?.slug).toBe('dtc_sales');
    });

    test('returns undefined for non-existent ID', () => {
      const category = getCategoryById('invalid-id');
      expect(category).toBeUndefined();
    });
  });

  describe('isPnLCategory', () => {
    test('returns true for P&L categories', () => {
      expect(isPnLCategory('dtc_sales')).toBe(true);
      expect(isPnLCategory('inventory_purchases')).toBe(true);
      expect(isPnLCategory('stripe_fees')).toBe(true);
    });

    test('returns false for non-P&L categories', () => {
      expect(isPnLCategory('sales_tax_payable')).toBe(false);
      expect(isPnLCategory('shopify_payouts_clearing')).toBe(false);
    });

    test('returns false for non-existent categories', () => {
      expect(isPnLCategory('non_existent')).toBe(false);
    });
  });

  describe('getPromptCategories', () => {
    test('returns only categories that should be included in prompts', () => {
      const categories = getPromptCategories();

      // Should include revenue categories
      expect(categories.some(c => c.slug === 'dtc_sales')).toBe(true);

      // Should include operating expenses
      expect(categories.some(c => c.slug === 'stripe_fees')).toBe(true);

      // Should exclude clearing accounts
      expect(categories.some(c => c.slug === 'shopify_payouts_clearing')).toBe(false);

      // Should exclude parent categories
      expect(categories.some(c => c.slug === 'revenue')).toBe(false);

      // Should exclude post-MVP categories
      expect(categories.some(c => c.slug === 'amazon_fees')).toBe(false);
    });
  });

  describe('getCategoriesByType', () => {
    test('returns revenue categories', () => {
      const revenue = getCategoriesByType('revenue');
      expect(revenue.length).toBeGreaterThan(0);
      expect(revenue.every(c => c.type === 'revenue')).toBe(true);
      expect(revenue.some(c => c.slug === 'dtc_sales')).toBe(true);
    });

    test('returns COGS categories', () => {
      const cogs = getCategoriesByType('cogs');
      expect(cogs.length).toBeGreaterThan(0);
      expect(cogs.every(c => c.type === 'cogs')).toBe(true);
      expect(cogs.some(c => c.slug === 'inventory_purchases')).toBe(true);
    });

    test('returns operating expense categories', () => {
      const opex = getCategoriesByType('opex');
      expect(opex.length).toBeGreaterThan(10);
      expect(opex.every(c => c.type === 'opex')).toBe(true);
      expect(opex.some(c => c.slug === 'stripe_fees')).toBe(true);
    });
  });

  describe('getChildCategories', () => {
    test('returns child categories for payment processing', () => {
      const children = getChildCategories('payment_processing_fees');
      expect(children.length).toBeGreaterThan(0);
      expect(children.some(c => c.slug === 'stripe_fees')).toBe(true);
      expect(children.some(c => c.slug === 'paypal_fees')).toBe(true);
    });

    test('returns empty array for leaf categories', () => {
      const children = getChildCategories('dtc_sales');
      expect(children.length).toBe(0);
    });

    test('returns empty array for non-existent categories', () => {
      const children = getChildCategories('non_existent');
      expect(children.length).toBe(0);
    });
  });

  describe('mapCategorySlugToId', () => {
    test('maps valid slugs to correct IDs', () => {
      const id = mapCategorySlugToId('dtc_sales');
      expect(id).toBe('550e8400-e29b-41d4-a716-446655440101');
    });

    test('falls back to other_ops for invalid slugs', () => {
      const id = mapCategorySlugToId('invalid_slug');
      const otherOpsId = getCategoryBySlug('other_ops')?.id;
      expect(id).toBe(otherOpsId);
    });
  });

  describe('createSlugToIdMapping', () => {
    test('creates complete mapping of all categories', () => {
      const mapping = createSlugToIdMapping();

      // Should include all categories
      expect(Object.keys(mapping).length).toBe(ECOMMERCE_TAXONOMY.length);

      // Should map correctly
      expect(mapping.dtc_sales).toBe('550e8400-e29b-41d4-a716-446655440101');
      expect(mapping.stripe_fees).toBe('550e8400-e29b-41d4-a716-446655440311');
    });
  });

  describe('taxonomy validation', () => {
    test('all categories have required fields', () => {
      for (const category of ECOMMERCE_TAXONOMY) {
        expect(category.id).toBeDefined();
        expect(category.slug).toBeDefined();
        expect(category.name).toBeDefined();
        expect(category.type).toBeDefined();
        expect(typeof category.isPnL).toBe('boolean');
        expect(typeof category.includeInPrompt).toBe('boolean');
      }
    });

    test('parent references are valid', () => {
      const allIds = new Set(ECOMMERCE_TAXONOMY.map(c => c.id));

      for (const category of ECOMMERCE_TAXONOMY) {
        if (category.parentId) {
          expect(allIds.has(category.parentId)).toBe(true);
        }
      }
    });

    test('all slugs are unique', () => {
      const slugs = ECOMMERCE_TAXONOMY.map(c => c.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);
    });

    test('all IDs are unique', () => {
      const ids = ECOMMERCE_TAXONOMY.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    test('clearing and liability categories are not in P&L', () => {
      const nonPnLCategories = ECOMMERCE_TAXONOMY.filter(c =>
        c.type === 'clearing' || c.type === 'liability'
      );

      for (const category of nonPnLCategories) {
        expect(category.isPnL).toBe(false);
      }
    });

    test('clearing and liability categories are not in prompts', () => {
      const hiddenCategories = ECOMMERCE_TAXONOMY.filter(c =>
        c.type === 'clearing' || c.type === 'liability'
      );

      for (const category of hiddenCategories) {
        expect(category.includeInPrompt).toBe(false);
      }
    });
  });
});