export type Industry = 'ecommerce';

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  type: 'revenue' | 'cogs' | 'opex' | 'liability' | 'clearing';
  isPnL: boolean;
  includeInPrompt: boolean;
}

/**
 * Static UUID mapping that matches the database migration
 * These UUIDs are consistent across environments
 */
const CATEGORY_IDS = {
  // Parent categories
  'revenue': '550e8400-e29b-41d4-a716-446655440100',
  'cogs': '550e8400-e29b-41d4-a716-446655440200',
  'operating_expenses': '550e8400-e29b-41d4-a716-446655440300',
  'taxes_liabilities': '550e8400-e29b-41d4-a716-446655440400',
  'clearing': '550e8400-e29b-41d4-a716-446655440500',

  // Revenue
  'dtc_sales': '550e8400-e29b-41d4-a716-446655440101',
  'shipping_income': '550e8400-e29b-41d4-a716-446655440102',
  'discounts_contra': '550e8400-e29b-41d4-a716-446655440103',
  'refunds_allowances_contra': '550e8400-e29b-41d4-a716-446655440104',

  // COGS
  'inventory_purchases': '550e8400-e29b-41d4-a716-446655440201',
  'inbound_freight': '550e8400-e29b-41d4-a716-446655440202',
  'packaging_supplies': '550e8400-e29b-41d4-a716-446655440203',
  'manufacturing_costs': '550e8400-e29b-41d4-a716-446655440204',

  // Payment Processing
  'payment_processing_fees': '550e8400-e29b-41d4-a716-446655440301',
  'stripe_fees': '550e8400-e29b-41d4-a716-446655440311',
  'paypal_fees': '550e8400-e29b-41d4-a716-446655440312',
  'shop_pay_fees': '550e8400-e29b-41d4-a716-446655440313',
  'bnpl_fees': '550e8400-e29b-41d4-a716-446655440314',

  // Marketing
  'marketing': '550e8400-e29b-41d4-a716-446655440302',
  'ads_meta': '550e8400-e29b-41d4-a716-446655440321',
  'ads_google': '550e8400-e29b-41d4-a716-446655440322',
  'ads_tiktok': '550e8400-e29b-41d4-a716-446655440323',
  'ads_other': '550e8400-e29b-41d4-a716-446655440324',

  // Platform & Tools
  'shopify_platform': '550e8400-e29b-41d4-a716-446655440331',
  'app_subscriptions': '550e8400-e29b-41d4-a716-446655440332',
  'email_sms_tools': '550e8400-e29b-41d4-a716-446655440333',

  // Fulfillment & Logistics
  'fulfillment_3pl_fees': '550e8400-e29b-41d4-a716-446655440341',
  'warehouse_storage': '550e8400-e29b-41d4-a716-446655440342',
  'shipping_expense': '550e8400-e29b-41d4-a716-446655440343',
  'returns_processing': '550e8400-e29b-41d4-a716-446655440344',

  // General Business
  'software_general': '550e8400-e29b-41d4-a716-446655440351',
  'professional_services': '550e8400-e29b-41d4-a716-446655440352',
  'rent_utilities': '550e8400-e29b-41d4-a716-446655440353',
  'insurance': '550e8400-e29b-41d4-a716-446655440354',
  'payroll_contractors': '550e8400-e29b-41d4-a716-446655440355',
  'office_supplies': '550e8400-e29b-41d4-a716-446655440356',
  'travel': '550e8400-e29b-41d4-a716-446655440357',
  'bank_fees': '550e8400-e29b-41d4-a716-446655440358',
  'other_ops': '550e8400-e29b-41d4-a716-446655440359',

  // Taxes & Liabilities
  'sales_tax_payable': '550e8400-e29b-41d4-a716-446655440401',
  'duties_import_taxes': '550e8400-e29b-41d4-a716-446655440402',

  // Clearing
  'shopify_payouts_clearing': '550e8400-e29b-41d4-a716-446655440501',

  // Post-MVP
  'amazon_fees': '550e8400-e29b-41d4-a716-446655440360',
  'amazon_payouts': '550e8400-e29b-41d4-a716-446655440502',
} as const;

/**
 * E-commerce taxonomy tree with stable UUIDs
 */
export const ECOMMERCE_TAXONOMY: CategoryNode[] = [
  // Revenue Categories
  {
    id: CATEGORY_IDS.dtc_sales,
    slug: 'dtc_sales',
    name: 'DTC Sales',
    parentId: CATEGORY_IDS.revenue,
    type: 'revenue',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.shipping_income,
    slug: 'shipping_income',
    name: 'Shipping Income',
    parentId: CATEGORY_IDS.revenue,
    type: 'revenue',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.discounts_contra,
    slug: 'discounts_contra',
    name: 'Discounts (Contra-Revenue)',
    parentId: CATEGORY_IDS.revenue,
    type: 'revenue',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.refunds_allowances_contra,
    slug: 'refunds_allowances_contra',
    name: 'Refunds & Allowances (Contra-Revenue)',
    parentId: CATEGORY_IDS.revenue,
    type: 'revenue',
    isPnL: true,
    includeInPrompt: true,
  },

  // Cost of Goods Sold
  {
    id: CATEGORY_IDS.inventory_purchases,
    slug: 'inventory_purchases',
    name: 'Inventory Purchases',
    parentId: CATEGORY_IDS.cogs,
    type: 'cogs',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.inbound_freight,
    slug: 'inbound_freight',
    name: 'Inbound Freight',
    parentId: CATEGORY_IDS.cogs,
    type: 'cogs',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.packaging_supplies,
    slug: 'packaging_supplies',
    name: 'Packaging Supplies',
    parentId: CATEGORY_IDS.cogs,
    type: 'cogs',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.manufacturing_costs,
    slug: 'manufacturing_costs',
    name: 'Manufacturing Costs',
    parentId: CATEGORY_IDS.cogs,
    type: 'cogs',
    isPnL: true,
    includeInPrompt: true,
  },

  // Operating Expenses - Payment Processing
  {
    id: CATEGORY_IDS.payment_processing_fees,
    slug: 'payment_processing_fees',
    name: 'Payment Processing Fees',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.stripe_fees,
    slug: 'stripe_fees',
    name: 'Stripe Fees',
    parentId: CATEGORY_IDS.payment_processing_fees,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.paypal_fees,
    slug: 'paypal_fees',
    name: 'PayPal Fees',
    parentId: CATEGORY_IDS.payment_processing_fees,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.shop_pay_fees,
    slug: 'shop_pay_fees',
    name: 'Shop Pay Fees',
    parentId: CATEGORY_IDS.payment_processing_fees,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.bnpl_fees,
    slug: 'bnpl_fees',
    name: 'BNPL Fees',
    parentId: CATEGORY_IDS.payment_processing_fees,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },

  // Operating Expenses - Marketing
  {
    id: CATEGORY_IDS.marketing,
    slug: 'marketing',
    name: 'Marketing & Advertising',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.ads_meta,
    slug: 'ads_meta',
    name: 'Meta Ads',
    parentId: CATEGORY_IDS.marketing,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.ads_google,
    slug: 'ads_google',
    name: 'Google Ads',
    parentId: CATEGORY_IDS.marketing,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.ads_tiktok,
    slug: 'ads_tiktok',
    name: 'TikTok Ads',
    parentId: CATEGORY_IDS.marketing,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.ads_other,
    slug: 'ads_other',
    name: 'Other Ads',
    parentId: CATEGORY_IDS.marketing,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },

  // Operating Expenses - Platform & Tools
  {
    id: CATEGORY_IDS.shopify_platform,
    slug: 'shopify_platform',
    name: 'Shopify Platform',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.app_subscriptions,
    slug: 'app_subscriptions',
    name: 'App Subscriptions',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.email_sms_tools,
    slug: 'email_sms_tools',
    name: 'Email/SMS Tools',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },

  // Operating Expenses - Fulfillment & Logistics
  {
    id: CATEGORY_IDS.fulfillment_3pl_fees,
    slug: 'fulfillment_3pl_fees',
    name: 'Fulfillment & 3PL Fees',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.warehouse_storage,
    slug: 'warehouse_storage',
    name: 'Warehouse Storage',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.shipping_expense,
    slug: 'shipping_expense',
    name: 'Shipping Expense',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.returns_processing,
    slug: 'returns_processing',
    name: 'Returns Processing',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },

  // Operating Expenses - General Business
  {
    id: CATEGORY_IDS.software_general,
    slug: 'software_general',
    name: 'Software (General)',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.professional_services,
    slug: 'professional_services',
    name: 'Professional Services',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.rent_utilities,
    slug: 'rent_utilities',
    name: 'Rent & Utilities',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.insurance,
    slug: 'insurance',
    name: 'Insurance',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.payroll_contractors,
    slug: 'payroll_contractors',
    name: 'Payroll/Contractors',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.office_supplies,
    slug: 'office_supplies',
    name: 'Office Supplies',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.travel,
    slug: 'travel',
    name: 'Travel & Transportation',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.bank_fees,
    slug: 'bank_fees',
    name: 'Bank Fees',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },
  {
    id: CATEGORY_IDS.other_ops,
    slug: 'other_ops',
    name: 'Other Operating Expenses',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },

  // Taxes & Liabilities (not in P&L)
  {
    id: CATEGORY_IDS.sales_tax_payable,
    slug: 'sales_tax_payable',
    name: 'Sales Tax Payable',
    parentId: CATEGORY_IDS.taxes_liabilities,
    type: 'liability',
    isPnL: false,
    includeInPrompt: false,
  },
  {
    id: CATEGORY_IDS.duties_import_taxes,
    slug: 'duties_import_taxes',
    name: 'Duties & Import Taxes',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: true,
  },

  // Clearing Accounts (not in P&L)
  {
    id: CATEGORY_IDS.shopify_payouts_clearing,
    slug: 'shopify_payouts_clearing',
    name: 'Shopify Payouts Clearing',
    parentId: CATEGORY_IDS.clearing,
    type: 'clearing',
    isPnL: false,
    includeInPrompt: false,
  },

  // Post-MVP placeholders (hidden from prompt)
  {
    id: CATEGORY_IDS.amazon_fees,
    slug: 'amazon_fees',
    name: 'Amazon Fees',
    parentId: CATEGORY_IDS.operating_expenses,
    type: 'opex',
    isPnL: true,
    includeInPrompt: false,
  },
  {
    id: CATEGORY_IDS.amazon_payouts,
    slug: 'amazon_payouts',
    name: 'Amazon Payouts',
    parentId: CATEGORY_IDS.clearing,
    type: 'clearing',
    isPnL: false,
    includeInPrompt: false,
  },

  // Parent Categories
  {
    id: CATEGORY_IDS.revenue,
    slug: 'revenue',
    name: 'Revenue',
    parentId: null,
    type: 'revenue',
    isPnL: true,
    includeInPrompt: false,
  },
  {
    id: CATEGORY_IDS.cogs,
    slug: 'cogs',
    name: 'Cost of Goods Sold',
    parentId: null,
    type: 'cogs',
    isPnL: true,
    includeInPrompt: false,
  },
  {
    id: CATEGORY_IDS.operating_expenses,
    slug: 'operating_expenses',
    name: 'Operating Expenses',
    parentId: null,
    type: 'opex',
    isPnL: true,
    includeInPrompt: false,
  },
  {
    id: CATEGORY_IDS.taxes_liabilities,
    slug: 'taxes_liabilities',
    name: 'Taxes & Liabilities',
    parentId: null,
    type: 'liability',
    isPnL: false,
    includeInPrompt: false,
  },
  {
    id: CATEGORY_IDS.clearing,
    slug: 'clearing',
    name: 'Clearing',
    parentId: null,
    type: 'clearing',
    isPnL: false,
    includeInPrompt: false,
  },
];

/**
 * Helper functions for working with taxonomy
 */

export function getActiveTaxonomy(): CategoryNode[] {
  return ECOMMERCE_TAXONOMY;
}

export function getCategoryBySlug(slug: string): CategoryNode | undefined {
  return ECOMMERCE_TAXONOMY.find(category => category.slug === slug);
}

export function getCategoryById(id: string): CategoryNode | undefined {
  return ECOMMERCE_TAXONOMY.find(category => category.id === id);
}

export function isPnLCategory(slug: string): boolean {
  const category = getCategoryBySlug(slug);
  return category?.isPnL ?? false;
}

export function getPromptCategories(): CategoryNode[] {
  return ECOMMERCE_TAXONOMY.filter(category => category.includeInPrompt);
}

export function getCategoriesByType(type: CategoryNode['type']): CategoryNode[] {
  return ECOMMERCE_TAXONOMY.filter(category => category.type === type);
}

export function getChildCategories(parentSlug: string): CategoryNode[] {
  const parent = getCategoryBySlug(parentSlug);
  if (!parent) return [];

  return ECOMMERCE_TAXONOMY.filter(category => category.parentId === parent.id);
}

/**
 * Maps category slug to database ID with fallback
 */
export function mapCategorySlugToId(slug: string): string {
  const category = getCategoryBySlug(slug);
  if (category) {
    return category.id;
  }

  // Fallback to "Other Operating Expenses"
  const fallback = getCategoryBySlug('other_ops');
  return fallback?.id || CATEGORY_IDS.other_ops;
}

/**
 * Creates a slug-to-ID mapping for use in database operations
 */
export function createSlugToIdMapping(): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const category of ECOMMERCE_TAXONOMY) {
    mapping[category.slug] = category.id;
  }

  return mapping;
}