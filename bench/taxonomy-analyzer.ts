/**
 * Taxonomy Analysis Tool
 *
 * Analyzes the e-commerce taxonomy for:
 * - Coverage gaps and under-represented categories
 * - Collision detection between overlapping categories
 * - Category boundary ambiguities
 * - Taxonomy completeness for e-commerce edge cases
 */

import { ECOMMERCE_TAXONOMY, TWO_TIER_TAXONOMY, type CategoryNode } from '../packages/categorizer/src/taxonomy.js';

interface TaxonomyAnalysisResult {
  summary: {
    totalCategories: number;
    pnlCategories: number;
    nonPnlCategories: number;
    promptCategories: number;
    parentCategories: number;
    leafCategories: number;
  };
  coverage: {
    revenueCategories: string[];
    cogsCategories: string[];
    opexCategories: string[];
    liabilityCategories: string[];
    clearingCategories: string[];
  };
  collisionRisks: Array<{
    category1: string;
    category2: string;
    riskLevel: 'high' | 'medium' | 'low';
    reason: string;
    examples: string[];
  }>;
  edgeCases: Array<{
    scenario: string;
    covered: boolean;
    recommendedCategory?: string;
    notes: string;
  }>;
  underRepresentedCategories: string[];
  recommendations: string[];
}

/**
 * Known e-commerce edge cases that need explicit category coverage
 */
const ECOMMERCE_EDGE_CASES = [
  {
    scenario: 'Shopify payout clearing (composite transaction)',
    keywords: ['shopify payout', 'shopify settlement'],
    expectedCategory: 'shopify_payouts_clearing',
  },
  {
    scenario: 'Stripe fees (transaction fees, not payout)',
    keywords: ['stripe fee', 'stripe transaction fee'],
    expectedCategory: 'payment_processing_fees',
  },
  {
    scenario: 'PayPal fees (transaction fees, not payout)',
    keywords: ['paypal fee', 'paypal transaction fee'],
    expectedCategory: 'payment_processing_fees',
  },
  {
    scenario: 'BNPL fees (Affirm, Afterpay, Klarna)',
    keywords: ['affirm fee', 'afterpay fee', 'klarna fee', 'bnpl'],
    expectedCategory: 'bnpl_fees',
  },
  {
    scenario: '3PL fees (fulfillment center)',
    keywords: ['3pl fee', 'fulfillment center', 'shipbob', 'shipmonk'],
    expectedCategory: 'fulfillment_3pl_fees',
  },
  {
    scenario: 'Outbound shipping to customers',
    keywords: ['usps', 'fedex', 'ups shipping'],
    expectedCategory: 'shipping_expense',
  },
  {
    scenario: 'Inbound freight from suppliers',
    keywords: ['inbound freight', 'supplier shipping'],
    expectedCategory: 'inbound_freight',
  },
  {
    scenario: 'Sales tax liability payment',
    keywords: ['sales tax', 'state tax payment'],
    expectedCategory: 'sales_tax_payable',
  },
  {
    scenario: 'Customs/import duties',
    keywords: ['customs', 'import duty', 'tariff'],
    expectedCategory: 'duties_import_taxes',
  },
  {
    scenario: 'Chargeback/dispute',
    keywords: ['chargeback', 'dispute', 'reversal'],
    expectedCategory: 'refunds_allowances_contra',
  },
  {
    scenario: 'Customer refund',
    keywords: ['refund', 'customer return'],
    expectedCategory: 'refunds_allowances_contra',
  },
  {
    scenario: 'Packaging materials (boxes, mailers)',
    keywords: ['packaging', 'boxes', 'mailers'],
    expectedCategory: 'packaging_supplies',
  },
  {
    scenario: 'Returns processing cost (not refund to customer)',
    keywords: ['return processing', 'rma fee'],
    expectedCategory: 'returns_processing',
  },
  {
    scenario: 'Amazon marketplace fees',
    keywords: ['amazon fee', 'amazon referral'],
    expectedCategory: 'amazon_fees',
  },
  {
    scenario: 'FX/currency conversion fees',
    keywords: ['fx fee', 'currency conversion', 'foreign exchange'],
    expectedCategory: null, // Not covered!
  },
  {
    scenario: 'Cryptocurrency payment fees',
    keywords: ['crypto fee', 'bitcoin fee', 'coinbase'],
    expectedCategory: null, // Not covered!
  },
];

/**
 * Known collision risks between categories
 */
const KNOWN_COLLISION_RISKS = [
  {
    category1: 'shipping_expense',
    category2: 'fulfillment_3pl_fees',
    riskLevel: 'high' as const,
    reason: 'Fulfillment centers often bundle shipping with other services',
    examples: ['ShipBob combined invoice', 'ShipMonk monthly fees'],
  },
  {
    category1: 'inbound_freight',
    category2: 'inventory_purchases',
    riskLevel: 'medium' as const,
    reason: 'Suppliers may bundle shipping into product cost',
    examples: ['Alibaba orders with shipping', 'Wholesale orders FOB destination'],
  },
  {
    category1: 'packaging_supplies',
    category2: 'office_supplies',
    riskLevel: 'medium' as const,
    reason: 'Packaging materials from office supply stores (Staples, Office Depot)',
    examples: ['Staples boxes and tape', 'Office Depot mailers'],
  },
  {
    category1: 'software_general',
    category2: 'app_subscriptions',
    riskLevel: 'low' as const,
    reason: 'Distinction between general business software and e-commerce apps unclear',
    examples: ['QuickBooks (general) vs Shopify apps (e-comm specific)'],
  },
  {
    category1: 'returns_processing',
    category2: 'refunds_allowances_contra',
    riskLevel: 'high' as const,
    reason: 'Returns have both cost (processing) and revenue (refund) components',
    examples: ['Customer return: refund $50 + $5 restocking fee'],
  },
  {
    category1: 'shopify_platform',
    category2: 'app_subscriptions',
    riskLevel: 'medium' as const,
    reason: 'Shopify charges can be platform fee or app charges',
    examples: ['Shopify basic plan vs Shopify app charges'],
  },
  {
    category1: 'payment_processing_fees',
    category2: 'bank_fees',
    riskLevel: 'medium' as const,
    reason: 'Some bank fees related to payment processing overlap',
    examples: ['Wire transfer fees for payment settlements'],
  },
];

function analyzeTaxonomy(taxonomy: CategoryNode[]): TaxonomyAnalysisResult {
  const result: TaxonomyAnalysisResult = {
    summary: {
      totalCategories: taxonomy.length,
      pnlCategories: taxonomy.filter(c => c.isPnL).length,
      nonPnlCategories: taxonomy.filter(c => !c.isPnL).length,
      promptCategories: taxonomy.filter(c => c.includeInPrompt).length,
      parentCategories: taxonomy.filter(c => c.parentId === null).length,
      leafCategories: taxonomy.filter(c => c.parentId !== null).length,
    },
    coverage: {
      revenueCategories: taxonomy.filter(c => c.type === 'revenue' && c.parentId !== null).map(c => c.slug),
      cogsCategories: taxonomy.filter(c => c.type === 'cogs' && c.parentId !== null).map(c => c.slug),
      opexCategories: taxonomy.filter(c => c.type === 'opex' && c.parentId !== null).map(c => c.slug),
      liabilityCategories: taxonomy.filter(c => c.type === 'liability' && c.parentId !== null).map(c => c.slug),
      clearingCategories: taxonomy.filter(c => c.type === 'clearing' && c.parentId !== null).map(c => c.slug),
    },
    collisionRisks: KNOWN_COLLISION_RISKS,
    edgeCases: [],
    underRepresentedCategories: [],
    recommendations: [],
  };

  // Analyze edge case coverage
  for (const edgeCase of ECOMMERCE_EDGE_CASES) {
    const covered = edgeCase.expectedCategory !== null &&
                    taxonomy.some(c => c.slug === edgeCase.expectedCategory);

    result.edgeCases.push({
      scenario: edgeCase.scenario,
      covered,
      recommendedCategory: edgeCase.expectedCategory || undefined,
      notes: covered
        ? 'Covered by existing taxonomy'
        : 'MISSING - needs new category or explicit mapping',
    });
  }

  // Identify under-represented categories (likely to have low transaction volume)
  const likelyUnderRepresented = [
    'duties_import_taxes', // Only for businesses importing goods
    'returns_processing', // Separate from refunds, often not tracked
    'warehouse_storage', // Only for businesses with inventory
    'amazon_fees', // Only for Amazon sellers
    'manufacturing_costs', // Only for manufacturers
  ];

  result.underRepresentedCategories = likelyUnderRepresented.filter(slug =>
    taxonomy.some(c => c.slug === slug)
  );

  // Generate recommendations
  const missingEdgeCases = result.edgeCases.filter(ec => !ec.covered);
  if (missingEdgeCases.length > 0) {
    result.recommendations.push(
      `Add ${missingEdgeCases.length} missing edge case categories: ` +
      missingEdgeCases.map(ec => ec.scenario).join(', ')
    );
  }

  const highRiskCollisions = result.collisionRisks.filter(cr => cr.riskLevel === 'high');
  if (highRiskCollisions.length > 0) {
    result.recommendations.push(
      `Document disambiguation rules for ${highRiskCollisions.length} high-risk category collisions`
    );
  }

  if (result.underRepresentedCategories.length > 0) {
    result.recommendations.push(
      `Monitor transaction counts for ${result.underRepresentedCategories.length} under-represented categories; ` +
      'prioritize labeling/active learning if count < 10 per month'
    );
  }

  const promptCoveragePercent = (result.summary.promptCategories / result.summary.leafCategories) * 100;
  if (promptCoveragePercent < 80) {
    result.recommendations.push(
      `Prompt coverage is ${promptCoveragePercent.toFixed(1)}%; consider including more categories in LLM prompts`
    );
  }

  return result;
}

// Run analysis on both taxonomies
const legacyAnalysis = analyzeTaxonomy(ECOMMERCE_TAXONOMY);
const twoTierAnalysis = analyzeTaxonomy(TWO_TIER_TAXONOMY);

const analysisResults = {
  generated_at: new Date().toISOString(),
  taxonomies: {
    legacy_ecommerce: {
      name: 'Legacy E-Commerce Taxonomy',
      analysis: legacyAnalysis,
    },
    two_tier: {
      name: 'Two-Tier Umbrella Bucket Taxonomy',
      analysis: twoTierAnalysis,
    },
  },
  comparison: {
    category_count_diff: twoTierAnalysis.summary.totalCategories - legacyAnalysis.summary.totalCategories,
    prompt_category_diff: twoTierAnalysis.summary.promptCategories - legacyAnalysis.summary.promptCategories,
    notes: 'Two-tier taxonomy simplifies categorization by reducing leaf categories to 10-12 umbrella buckets',
  },
};

// Output as JSON
console.log(JSON.stringify(analysisResults, null, 2));
