import { NextRequest, NextResponse } from 'next/server';

// Types
interface ShopifyConnection {
  id: string;
  org_id: string | null;
  shop_domain: string;
  access_token: string;
  scope: string;
  is_active: boolean;
  last_synced_at: string | null;
  installed_at: string;
  created_at: string;
  updated_at: string;
  auth_id: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  currency: string;
  financial_status: string;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
  refunds: Array<{
    id: number;
    created_at: string;
    order_id: number;
    transactions: Array<{
      id: number;
      amount: string;
      kind: string;
      created_at: string;
    }>;
  }>;
  transactions: Array<{
    id: number;
    order_id: number;
    kind: string;
    gateway: string;
    status: string;
    amount: string;
    currency: string;
    created_at: string;
    fee: string | null;
    processed_at: string;
  }>;
}

interface Transaction {
  id: string;
  org_id: string;
  account_id: string;
  date: string;
  amount_cents: number;
  currency: string;
  description: string;
  merchant_name: string | null;
  mcc: string | null;
  raw: string;
  category_id: string;
  confidence: string;
  source: string;
  receipt_id: string | null;
  reviewed: boolean;
  created_at: string;
  needs_review: boolean;
  normalized_vendor: string | null;
  updated_at: string;
  provider_tx_id: string;
  attributes: string;
}

// Category IDs from your categories table
const CATEGORY_IDS = {
  SALES: '550e8400-e29b-41d4-a716-446655440101', // Product Sales
  FEES: '550e8400-e29b-41d4-a716-446655440301', // Payment Processing Fees
  REFUNDS: '550e8400-e29b-41d4-a716-446655440105', // Refunds (Contra-Revenue)
  TAXES: '550e8400-e29b-41d4-a716-446655440401', // Sales Tax Payable
};

// Helper Functions
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toCents(amount: string | number): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(num * 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toISOString().split('T')[0];
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Database Functions
async function getActiveShopifyConnections(): Promise<ShopifyConnection[]> {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('shopify_connections')
    .select('*')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to fetch Shopify connections: ${error.message}`);
  }

  return data || [];
}

async function updateLastSyncedAt(connectionId: string): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('shopify_connections')
    .update({ 
      last_synced_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp()
    })
    .eq('id', connectionId);

  if (error) {
    console.error(`Failed to update last_synced_at for connection ${connectionId}:`, error);
  }
}

async function saveTransactionsToDatabase(transactions: Transaction[]): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Batch insert with upsert
  const { error } = await supabase
    .from('transactions')
    .upsert(transactions, {
      onConflict: 'provider_tx_id',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

// Shopify API Helpers
async function fetchShopifyOrders(
  shopDomain: string,
  accessToken: string,
  sinceId?: number,
  limit: number = 250
): Promise<ShopifyOrder[]> {
  const url = new URL(`https://${shopDomain}/admin/api/2024-10/orders.json`);
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('status', 'any');
  url.searchParams.append('financial_status', 'any');
  
  if (sinceId) {
    url.searchParams.append('since_id', sinceId.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify API error for ${shopDomain}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.orders || [];
}

async function fetchAllShopifyOrders(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = [];
  let sinceId: number | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const orders = await fetchShopifyOrders(shopDomain, accessToken, sinceId, 250);
    
    if (orders.length === 0) {
      hasMore = false;
    } else {
      allOrders.push(...orders);
      sinceId = orders[orders.length - 1].id;
      
      if (orders.length < 250) {
        hasMore = false;
      }
    }
  }

  return allOrders;
}

// Transaction Normalization Functions
function normalizeOrderTransaction(
  order: ShopifyOrder,
  orgId: string,
  accountId: string
): Transaction {
  const timestamp = getCurrentTimestamp();
  const customerName = order.customer
    ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
    : 'Unknown Customer';

  return {
    id: generateUUID(),
    org_id: orgId,
    account_id: accountId,
    date: formatDate(order.created_at),
    amount_cents: -toCents(order.total_price), // Negative for income
    currency: order.currency,
    description: `Shopify Order #${order.order_number}`,
    merchant_name: customerName,
    mcc: null,
    raw: JSON.stringify({
      order_id: order.id,
      order_number: order.order_number,
      customer: order.customer,
      line_items: order.line_items,
      subtotal: order.subtotal_price,
      tax: order.total_tax,
      discounts: order.total_discounts,
      total: order.total_price,
      financial_status: order.financial_status,
      created_at: order.created_at,
      updated_at: order.updated_at,
    }),
    category_id: CATEGORY_IDS.SALES,
    confidence: '0.95',
    source: 'shopify',
    receipt_id: null,
    reviewed: false,
    created_at: timestamp,
    needs_review: false,
    normalized_vendor: customerName.toLowerCase(),
    updated_at: timestamp,
    provider_tx_id: `shopify_order_${order.id}`,
    attributes: JSON.stringify({
      order_number: order.order_number,
      financial_status: order.financial_status,
      item_count: order.line_items.reduce((sum, item) => sum + item.quantity, 0),
      customer_email: order.customer?.email || null,
      channel: 'online',
      product_line: 'shopify_store',
    }),
  };
}

function normalizeTaxTransaction(
  order: ShopifyOrder,
  orgId: string,
  accountId: string
): Transaction | null {
  const taxAmount = parseFloat(order.total_tax);
  if (taxAmount <= 0) return null;

  const timestamp = getCurrentTimestamp();

  return {
    id: generateUUID(),
    org_id: orgId,
    account_id: accountId,
    date: formatDate(order.created_at),
    amount_cents: toCents(order.total_tax), // Positive for liability
    currency: order.currency,
    description: `Sales Tax - Order #${order.order_number}`,
    merchant_name: 'Tax Authority',
    mcc: null,
    raw: JSON.stringify({
      order_id: order.id,
      order_number: order.order_number,
      tax_amount: order.total_tax,
      created_at: order.created_at,
    }),
    category_id: CATEGORY_IDS.TAXES,
    confidence: '0.99',
    source: 'shopify',
    receipt_id: null,
    reviewed: false,
    created_at: timestamp,
    needs_review: false,
    normalized_vendor: 'tax authority',
    updated_at: timestamp,
    provider_tx_id: `shopify_tax_${order.id}`,
    attributes: JSON.stringify({
      order_number: order.order_number,
      transaction_type: 'sales_tax',
    }),
  };
}

function normalizeFeeTransactions(
  order: ShopifyOrder,
  orgId: string,
  accountId: string
): Transaction[] {
  const feeTransactions: Transaction[] = [];
  const timestamp = getCurrentTimestamp();

  order.transactions.forEach((transaction) => {
    if (transaction.fee && parseFloat(transaction.fee) > 0) {
      feeTransactions.push({
        id: generateUUID(),
        org_id: orgId,
        account_id: accountId,
        date: formatDate(transaction.created_at),
        amount_cents: toCents(transaction.fee), // Positive for expense
        currency: transaction.currency,
        description: `Payment Processing Fee - Order #${order.order_number}`,
        merchant_name: transaction.gateway,
        mcc: null,
        raw: JSON.stringify({
          order_id: order.id,
          order_number: order.order_number,
          transaction_id: transaction.id,
          gateway: transaction.gateway,
          kind: transaction.kind,
          status: transaction.status,
          fee: transaction.fee,
          amount: transaction.amount,
          created_at: transaction.created_at,
        }),
        category_id: CATEGORY_IDS.FEES,
        confidence: '0.98',
        source: 'shopify',
        receipt_id: null,
        reviewed: false,
        created_at: timestamp,
        needs_review: false,
        normalized_vendor: transaction.gateway.toLowerCase(),
        updated_at: timestamp,
        provider_tx_id: `shopify_fee_${transaction.id}`,
        attributes: JSON.stringify({
          order_number: order.order_number,
          gateway: transaction.gateway,
          transaction_type: 'payment_fee',
          fee_type: 'transaction',
          processor: transaction.gateway,
        }),
      });
    }
  });

  return feeTransactions;
}

function normalizeRefundTransactions(
  order: ShopifyOrder,
  orgId: string,
  accountId: string
): Transaction[] {
  const refundTransactions: Transaction[] = [];
  const timestamp = getCurrentTimestamp();

  order.refunds.forEach((refund) => {
    refund.transactions.forEach((transaction) => {
      if (transaction.kind === 'refund' && parseFloat(transaction.amount) > 0) {
        refundTransactions.push({
          id: generateUUID(),
          org_id: orgId,
          account_id: accountId,
          date: formatDate(transaction.created_at),
          amount_cents: toCents(transaction.amount), // Positive for contra-revenue
          currency: order.currency,
          description: `Refund - Order #${order.order_number}`,
          merchant_name: order.customer
            ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
            : 'Unknown Customer',
          mcc: null,
          raw: JSON.stringify({
            order_id: order.id,
            order_number: order.order_number,
            refund_id: refund.id,
            transaction_id: transaction.id,
            amount: transaction.amount,
            kind: transaction.kind,
            created_at: transaction.created_at,
          }),
          category_id: CATEGORY_IDS.REFUNDS,
          confidence: '0.97',
          source: 'shopify',
          receipt_id: null,
          reviewed: false,
          created_at: timestamp,
          needs_review: false,
          normalized_vendor: order.customer
            ? `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase()
            : 'unknown customer',
          updated_at: timestamp,
          provider_tx_id: `shopify_refund_${transaction.id}`,
          attributes: JSON.stringify({
            order_number: order.order_number,
            refund_id: refund.id,
            transaction_type: 'refund',
            reason: 'customer_refund',
          }),
        });
      }
    });
  });

  return refundTransactions;
}

function normalizeOrderToTransactions(
  order: ShopifyOrder,
  orgId: string,
  accountId: string
): Transaction[] {
  const transactions: Transaction[] = [];

  // 1. Main order transaction (sale/revenue)
  transactions.push(normalizeOrderTransaction(order, orgId, accountId));

  // 2. Tax transaction
  const taxTx = normalizeTaxTransaction(order, orgId, accountId);
  if (taxTx) {
    transactions.push(taxTx);
  }

  // 3. Fee transactions
  const feeTxs = normalizeFeeTransactions(order, orgId, accountId);
  transactions.push(...feeTxs);

  // 4. Refund transactions
  const refundTxs = normalizeRefundTransactions(order, orgId, accountId);
  transactions.push(...refundTxs);

  return transactions;
}

// Main Sync Function
async function syncShopifyConnection(connection: ShopifyConnection): Promise<{
  ordersProcessed: number;
  transactionsCreated: number;
  breakdown: { sales: number; taxes: number; fees: number; refunds: number };
}> {
  console.log(`Syncing Shopify store: ${connection.shop_domain}`);

  // Fetch all orders
  const orders = await fetchAllShopifyOrders(
    connection.shop_domain,
    connection.access_token
  );

  console.log(`Fetched ${orders.length} orders from ${connection.shop_domain}`);

  // Normalize orders into transactions
  const allTransactions: Transaction[] = [];
  
  // Use org_id from connection, or fall back to auth_id
  const orgId = connection.org_id || connection.auth_id;
  
  // Use connection.id as the account_id (represents the Shopify account)
  const accountId = connection.id;

  for (const order of orders) {
    const transactions = normalizeOrderToTransactions(order, orgId, accountId);
    allTransactions.push(...transactions);
  }

  console.log(
    `Normalized ${allTransactions.length} transactions from ${orders.length} orders`
  );

  // Save to database
  if (allTransactions.length > 0) {
    await saveTransactionsToDatabase(allTransactions);
  }

  // Update last_synced_at
  await updateLastSyncedAt(connection.id);

  return {
    ordersProcessed: orders.length,
    transactionsCreated: allTransactions.length,
    breakdown: {
      sales: allTransactions.filter((t) => t.category_id === CATEGORY_IDS.SALES).length,
      taxes: allTransactions.filter((t) => t.category_id === CATEGORY_IDS.TAXES).length,
      fees: allTransactions.filter((t) => t.category_id === CATEGORY_IDS.FEES).length,
      refunds: allTransactions.filter((t) => t.category_id === CATEGORY_IDS.REFUNDS).length,
    },
  };
}

// Main API Handler
export async function POST(request: NextRequest) {
  try {
    console.log('Starting Shopify sync for all active connections...');

    // Get all active Shopify connections
    const connections = await getActiveShopifyConnections();

    if (connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active Shopify connections found',
        connections: 0,
      });
    }

    console.log(`Found ${connections.length} active Shopify connection(s)`);

    // Sync each connection
    const results = [];
    const errors = [];

    for (const connection of connections) {
      try {
        const result = await syncShopifyConnection(connection);
        results.push({
          shopDomain: connection.shop_domain,
          orgId: connection.org_id || connection.auth_id,
          ...result,
        });
      } catch (error) {
        console.error(`Error syncing ${connection.shop_domain}:`, error);
        errors.push({
          shopDomain: connection.shop_domain,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate totals
    const totals = results.reduce(
      (acc, result) => ({
        ordersProcessed: acc.ordersProcessed + result.ordersProcessed,
        transactionsCreated: acc.transactionsCreated + result.transactionsCreated,
        breakdown: {
          sales: acc.breakdown.sales + result.breakdown.sales,
          taxes: acc.breakdown.taxes + result.breakdown.taxes,
          fees: acc.breakdown.fees + result.breakdown.fees,
          refunds: acc.breakdown.refunds + result.breakdown.refunds,
        },
      }),
      {
        ordersProcessed: 0,
        transactionsCreated: 0,
        breakdown: { sales: 0, taxes: 0, fees: 0, refunds: 0 },
      }
    );

    return NextResponse.json({
      success: true,
      connectionsProcessed: connections.length,
      successfulSyncs: results.length,
      failedSyncs: errors.length,
      totals,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Shopify sync error:', error);

    return NextResponse.json(
      {
        error: 'Failed to sync Shopify data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const connections = await getActiveShopifyConnections();

    return NextResponse.json({
      status: 'ready',
      activeConnections: connections.length,
      connections: connections.map((c) => ({
        shopDomain: c.shop_domain,
        orgId: c.org_id || c.auth_id,
        lastSyncedAt: c.last_synced_at,
        installedAt: c.installed_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch connections',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}