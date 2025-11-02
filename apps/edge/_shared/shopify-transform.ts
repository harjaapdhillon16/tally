/**
 * Shopify order/refund transformation to normalized transactions
 * Maps Shopify revenue events to our ecommerce taxonomy
 */

export interface NormalizedTransaction {
  org_id: string;
  account_id: string | null;
  date: string; // YYYY-MM-DD
  amount_cents: number;
  currency: string;
  description: string;
  merchant_name: string;
  mcc?: string | null;
  raw: any;
  source: 'shopify';
  provider_tx_id: string;
  category_id?: string | null;
}

// Ecommerce category UUIDs from 015_ecommerce_taxonomy.sql
export const ECOMMERCE_CATEGORIES = {
  DTC_SALES: '550e8400-e29b-41d4-a716-446655440101',
  SHIPPING_INCOME: '550e8400-e29b-41d4-a716-446655440102',
  DISCOUNTS_CONTRA: '550e8400-e29b-41d4-a716-446655440103',
  REFUNDS_ALLOWANCES_CONTRA: '550e8400-e29b-41d4-a716-446655440104',
} as const;

/**
 * Convert dollar amount to cents
 */
function toCents(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(num * 100);
}

/**
 * Extract Shopify order ID from GID
 * e.g., "gid://shopify/Order/12345" => "12345"
 */
function extractOrderId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

/**
 * Extract Shopify refund ID from GID
 */
function extractRefundId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

/**
 * Transform a Shopify order (from webhook or bulk query) into normalized transactions
 * 
 * Creates up to 3 transactions per order:
 * 1. Revenue (subtotal excluding shipping and tax)
 * 2. Shipping income (if > 0)
 * 3. Discounts (contra-revenue, if > 0)
 * 
 * Sales tax is excluded per ecommerce policy (liability, not P&L)
 */
export function transformOrderToTransactions(
  order: any,
  orgId: string
): NormalizedTransaction[] {
  const transactions: NormalizedTransaction[] = [];
  
  // Extract order ID (handle both REST and GraphQL formats)
  const orderId = order.id?.includes('gid://') 
    ? extractOrderId(order.id)
    : order.id?.toString() || 'unknown';
  
  const orderName = order.name || `#${orderId}`;
  
  // Date from processedAt (webhook) or created_at (REST) or current date
  const dateStr = order.processed_at || order.processedAt || order.created_at || new Date().toISOString();
  const date = dateStr.slice(0, 10); // YYYY-MM-DD
  
  // Currency - handle both REST and GraphQL formats
  const currency = order.currency 
    || order.currentSubtotalPriceSet?.shopMoney?.currencyCode
    || order.total_price_set?.shop_money?.currency_code
    || 'USD';
  
  // Extract amounts (handle both REST and GraphQL formats)
  const subtotal = parseFloat(
    order.currentSubtotalPriceSet?.shopMoney?.amount
    || order.current_subtotal_price_set?.shop_money?.amount
    || order.current_subtotal_price
    || order.subtotal_price
    || '0'
  );
  
  const shipping = parseFloat(
    order.totalShippingPriceSet?.shopMoney?.amount
    || order.total_shipping_price_set?.shop_money?.amount
    || order.total_shipping_price
    || '0'
  );
  
  const discounts = parseFloat(
    order.totalDiscountsSet?.shopMoney?.amount
    || order.total_discounts_set?.shop_money?.amount
    || order.total_discounts
    || '0'
  );
  
  // 1. Revenue transaction (subtotal)
  if (subtotal > 0) {
    transactions.push({
      org_id: orgId,
      account_id: null, // No account mapping for Shopify (direct revenue)
      date,
      amount_cents: toCents(subtotal),
      currency,
      description: `Shopify order ${orderName}`,
      merchant_name: 'Shopify',
      raw: order,
      source: 'shopify',
      provider_tx_id: `order:${orderId}:revenue`,
      category_id: ECOMMERCE_CATEGORIES.DTC_SALES,
    });
  }
  
  // 2. Shipping income transaction
  if (shipping > 0) {
    transactions.push({
      org_id: orgId,
      account_id: null,
      date,
      amount_cents: toCents(shipping),
      currency,
      description: `Shipping income for ${orderName}`,
      merchant_name: 'Shopify',
      raw: { orderId, shipping, orderName },
      source: 'shopify',
      provider_tx_id: `order:${orderId}:shipping`,
      category_id: ECOMMERCE_CATEGORIES.SHIPPING_INCOME,
    });
  }
  
  // 3. Discounts (contra-revenue, negative amount)
  if (discounts > 0) {
    transactions.push({
      org_id: orgId,
      account_id: null,
      date,
      amount_cents: -toCents(discounts), // Negative for contra-revenue
      currency,
      description: `Discounts for ${orderName}`,
      merchant_name: 'Shopify',
      raw: { orderId, discounts, orderName },
      source: 'shopify',
      provider_tx_id: `order:${orderId}:discounts`,
      category_id: ECOMMERCE_CATEGORIES.DISCOUNTS_CONTRA,
    });
  }
  
  return transactions;
}

/**
 * Transform a Shopify refund into normalized transactions
 * 
 * Creates a single contra-revenue transaction for the refunded amount
 */
export function transformRefundToTransactions(
  refund: any,
  orgId: string,
  orderId?: string
): NormalizedTransaction[] {
  const transactions: NormalizedTransaction[] = [];
  
  // Extract refund ID (handle both REST and GraphQL formats)
  const refundId = refund.id?.includes('gid://')
    ? extractRefundId(refund.id)
    : refund.id?.toString() || 'unknown';
  
  // Extract order ID if not provided
  const orderIdResolved = orderId 
    || (refund.order_id?.includes('gid://') ? extractOrderId(refund.order_id) : refund.order_id)
    || 'unknown';
  
  // Date from createdAt or current date
  const dateStr = refund.created_at || refund.createdAt || new Date().toISOString();
  const date = dateStr.slice(0, 10);
  
  // Currency
  const currency = refund.currency
    || refund.totalRefundedSet?.shopMoney?.currencyCode
    || refund.total_refunded_set?.shop_money?.currency_code
    || 'USD';
  
  // Refund amount (handle both REST and GraphQL formats)
  const refundAmount = parseFloat(
    refund.totalRefundedSet?.shopMoney?.amount
    || refund.total_refunded_set?.shop_money?.amount
    || refund.total_refunded
    || '0'
  );
  
  if (refundAmount > 0) {
    transactions.push({
      org_id: orgId,
      account_id: null,
      date,
      amount_cents: -toCents(refundAmount), // Negative for contra-revenue
      currency,
      description: `Refund for order #${orderIdResolved}`,
      merchant_name: 'Shopify',
      raw: refund,
      source: 'shopify',
      provider_tx_id: `refund:${refundId}`,
      category_id: ECOMMERCE_CATEGORIES.REFUNDS_ALLOWANCES_CONTRA,
    });
  }
  
  return transactions;
}

/**
 * Validate that a Shopify order is in a paid state
 * Only paid orders should generate revenue transactions
 */
export function isOrderPaid(order: any): boolean {
  const financialStatus = order.financial_status || order.financialStatus;
  return financialStatus === 'paid' || financialStatus === 'partially_paid';
}




