import { describe, test, expect } from 'vitest';
import * as categorizerModule from './index.js';

describe('categorizer module exports', () => {
  test('exports all core functions', () => {
    expect(categorizerModule.buildCategorizationPrompt).toBeDefined();
    expect(categorizerModule.getActiveTaxonomy).toBeDefined();
    expect(categorizerModule.getCategoryBySlug).toBeDefined();
    expect(categorizerModule.getCategoryById).toBeDefined();
    expect(categorizerModule.mapCategorySlugToId).toBeDefined();
    expect(categorizerModule.getIndustryForOrg).toBeDefined();
    expect(categorizerModule.getCategorizationConfig).toBeDefined();
    expect(categorizerModule.applyEcommerceGuardrails).toBeDefined();
    expect(categorizerModule.getCategoryIdWithGuardrails).toBeDefined();
  });

  test('exports taxonomy constants', () => {
    expect(categorizerModule.ECOMMERCE_TAXONOMY).toBeDefined();
    expect(Array.isArray(categorizerModule.ECOMMERCE_TAXONOMY)).toBe(true);
    expect(categorizerModule.ECOMMERCE_TAXONOMY.length).toBeGreaterThan(40);
  });

  test('module structure maintains backward compatibility', () => {
    // Ensure we're not breaking existing imports
    const requiredExports = [
      'buildCategorizationPrompt',
      'getActiveTaxonomy',
      'getCategoryBySlug',
      'getCategoryById',
      'mapCategorySlugToId',
      'ECOMMERCE_TAXONOMY'
    ];

    for (const exportName of requiredExports) {
      expect(categorizerModule).toHaveProperty(exportName);
    }
  });

  test('taxonomy validation through exports', () => {
    const taxonomy = categorizerModule.ECOMMERCE_TAXONOMY;

    // Ensure all categories have required fields
    for (const category of taxonomy) {
      expect(category.id).toBeDefined();
      expect(category.slug).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.type).toBeDefined();
      expect(typeof category.isPnL).toBe('boolean');
      expect(typeof category.includeInPrompt).toBe('boolean');
    }
  });
});