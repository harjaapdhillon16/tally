// Supabase Edge Function: shopify-sync-orders
// Deploy to: supabase/functions/shopify-sync-orders/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  total_shipping_price_set: {
    shop_money: {
      amount: string;
      currency_code: string;
    };
  };
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    total_discount: string;
    sku: string | null;
    vendor: string | null;
  }>;
  shipping_address: any;
  billing_address: any;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  refunds: Array<{
    id: number;
    created_at: string;
    note: string | null;
    refund_line_items: Array<{
      id: number;
      quantity: number;
      line_item_id: number;
      subtotal: string;
      total_tax: string;
    }>;
    transactions: Array<{
      id: number;
      amount: string;
      kind: string;
      status: string;
      created_at: string;
    }>;
  }>;
}

interface ShopifyConnection {
  id: string;
  org_id: string;
  shop_domain: string;
  access_token: string;
  scopes: string[];
  is_active: boolean;
}

interface RequestPayload {
  orgId: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  syncMode?: 'full' | 'incremental'; // full = all history, incremental = last 60 days
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: RequestPayload = await req.json();
    const { orgId, startDate, endDate, syncMode = 'incremental' } = payload;

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'orgId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting Shopify sync for org: ${orgId}, mode: ${syncMode}`);

    // Fetch active Shopify connection
    const { data: connection, error: connError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      console.error('No active Shopify connection found:', connError);
      return new Response(
        JSON.stringify({ error: 'No active Shopify connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopifyConnection = connection as unknown as ShopifyConnection;
    const { shop_domain, access_token } = shopifyConnection;

    // Determine date range for sync
    let createdAtMin: string | undefined;
    let createdAtMax: string | undefined;

    if (syncMode === 'incremental') {
      // Last 60 days (Shopify free tier limit)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      createdAtMin = sixtyDaysAgo.toISOString();
    } else if (startDate) {
      createdAtMin = new Date(startDate).toISOString();
    }

    if (endDate) {
      createdAtMax = new Date(endDate).toISOString();
    }

    console.log('Fetching orders with date range:', { createdAtMin, createdAtMax });

    // Fetch all orders with pagination
    const allOrders: ShopifyOrder[] = [];
    let hasNextPage = true;
    let pageInfo: string | null = null;
    const apiVersion = '2025-10';

    while (hasNextPage) {
      const queryParams = new URLSearchParams({
        status: 'any', // Include all order statuses
        limit: '250', // Max allowed by Shopify
        ...(createdAtMin && { created_at_min: createdAtMin }),
        ...(createdAtMax && { created_at_max: createdAtMax }),
        ...(pageInfo && { page_info: pageInfo }),
      });

      const ordersUrl = `https://${shop_domain}/admin/api/${apiVersion}/orders.json?${queryParams}`;
      
      const ordersResponse = await fetch(ordersUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
      });

      if (!ordersResponse.ok) {
        const errorText = await ordersResponse.text();
        console.error('Failed to fetch orders:', {
          status: ordersResponse.status,
          error: errorText,
        });
        throw new Error(`Shopify API error: ${ordersResponse.status}`);
      }

      const ordersData = await ordersResponse.json();
      const orders = ordersData.orders || [];
      allOrders.push(...orders);

      // Check for pagination
      const linkHeader = ordersResponse.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        // Extract page_info from Link header
        const nextMatch = linkHeader.match(/page_info=([^&>]+)/);
        pageInfo = nextMatch ? nextMatch[1] : null;
        hasNextPage = !!pageInfo;
      } else {
        hasNextPage = false;
      }

      console.log(`Fetched ${orders.length} orders (total: ${allOrders.length})`);
    }

    console.log(`Total orders fetched: ${allOrders.length}`);

    // Process and store orders
    const processedOrders = [];
    const processedRefunds = [];

    for (const order of allOrders) {
      // Store order data
      const orderRecord = {
        org_id: orgId,
        shopify_order_id: order.id.toString(),
        order_number: order.order_number,
        email: order.email,
        created_at: order.created_at,
        updated_at: order.updated_at,
        total_price: parseFloat(order.total_price),
        subtotal_price: parseFloat(order.subtotal_price),
        total_tax: parseFloat(order.total_tax),
        total_discounts: parseFloat(order.total_discounts),
        total_shipping: parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0'),
        currency: order.currency,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        line_items: order.line_items,
        customer: order.customer,
        raw_data: order,
      };

      processedOrders.push(orderRecord);

      // Process refunds for this order
      if (order.refunds && order.refunds.length > 0) {
        for (const refund of order.refunds) {
          const refundAmount = refund.transactions
            .filter(t => t.kind === 'refund' && t.status === 'success')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

          const refundRecord = {
            org_id: orgId,
            shopify_refund_id: refund.id.toString(),
            shopify_order_id: order.id.toString(),
            order_number: order.order_number,
            created_at: refund.created_at,
            refund_amount: refundAmount,
            note: refund.note,
            refund_line_items: refund.refund_line_items,
            transactions: refund.transactions,
            raw_data: refund,
          };

          processedRefunds.push(refundRecord);
        }
      }
    }

    // Batch insert orders (upsert to handle duplicates)
    if (processedOrders.length > 0) {
      console.log(`Inserting ${processedOrders.length} orders...`);
      const { error: ordersError } = await supabase
        .from('shopify_orders')
        .upsert(processedOrders, {
          onConflict: 'shopify_order_id,org_id',
          ignoreDuplicates: false,
        });

      if (ordersError) {
        console.error('Error inserting orders:', ordersError);
        throw ordersError;
      }
    }

    // Batch insert refunds (upsert to handle duplicates)
    if (processedRefunds.length > 0) {
      console.log(`Inserting ${processedRefunds.length} refunds...`);
      const { error: refundsError } = await supabase
        .from('shopify_refunds')
        .upsert(processedRefunds, {
          onConflict: 'shopify_refund_id,org_id',
          ignoreDuplicates: false,
        });

      if (refundsError) {
        console.error('Error inserting refunds:', refundsError);
        throw refundsError;
      }
    }

    // Update last sync timestamp
    await supabase
      .from('shopify_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', shopifyConnection.id);

    console.log('Shopify sync completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        ordersCount: processedOrders.length,
        refundsCount: processedRefunds.length,
        syncedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Shopify sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});