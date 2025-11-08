// Supabase Edge Function: shopify-process-transactions
// Deploy to: supabase/functions/shopify-process-transactions/index.ts
// Purpose: Converts synced Shopify orders/refunds into Nexus transactions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  orgId: string;
  processOrders?: boolean;
  processRefunds?: boolean;
  batchSize?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ProcessRequest = await req.json();
    const { 
      orgId, 
      processOrders = true, 
      processRefunds = true,
      batchSize = 100 
    } = payload;

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'orgId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing Shopify data for org: ${orgId}`);

    let totalOrderTransactions = 0;
    let totalRefundTransactions = 0;

    // Process Orders
    if (processOrders) {
      const { data: orders, error: ordersError } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('org_id', orgId)
        .eq('financial_status', 'paid')
        .is('processed_at', null) // Only unprocessed orders
        .limit(batchSize);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      if (orders && orders.length > 0) {
        const transactions = [];

        for (const order of orders) {
          const baseMetadata = {
            shopify_order_id: order.shopify_order_id,
            order_number: order.order_number,
            customer_email: order.email,
            customer_name: order.customer
              ? `${order.customer.first_name} ${order.customer.last_name}`
              : undefined,
          };

          // 1. Product Sales Revenue
          if (order.subtotal_price > 0) {
            transactions.push({
              org_id: orgId,
              date: order.created_at,
              description: `Shopify Order #${order.order_number} - Product Sales`,
              amount: order.subtotal_price,
              currency: order.currency,
              source: 'shopify',
              source_id: `order-${order.shopify_order_id}-sales`,
              category: 'Revenue',
              subcategory: 'Product Sales',
              metadata: {
                ...baseMetadata,
                transaction_type: 'product_sales',
                line_items_count: order.line_items?.length || 0,
              },
            });
          }

          // 2. Shipping Income
          if (order.total_shipping > 0) {
            transactions.push({
              org_id: orgId,
              date: order.created_at,
              description: `Shopify Order #${order.order_number} - Shipping`,
              amount: order.total_shipping,
              currency: order.currency,
              source: 'shopify',
              source_id: `order-${order.shopify_order_id}-shipping`,
              category: 'Revenue',
              subcategory: 'Shipping Income',
              metadata: {
                ...baseMetadata,
                transaction_type: 'shipping_income',
              },
            });
          }

          // 3. Sales Tax (Non-P&L liability)
          if (order.total_tax > 0) {
            transactions.push({
              org_id: orgId,
              date: order.created_at,
              description: `Shopify Order #${order.order_number} - Sales Tax`,
              amount: order.total_tax,
              currency: order.currency,
              source: 'shopify',
              source_id: `order-${order.shopify_order_id}-tax`,
              category: 'Non-P&L',
              subcategory: 'Sales Tax Collected',
              metadata: {
                ...baseMetadata,
                transaction_type: 'sales_tax',
              },
            });
          }

          // 4. Discounts (Contra-Revenue)
          if (order.total_discounts > 0) {
            transactions.push({
              org_id: orgId,
              date: order.created_at,
              description: `Shopify Order #${order.order_number} - Discounts`,
              amount: -order.total_discounts,
              currency: order.currency,
              source: 'shopify',
              source_id: `order-${order.shopify_order_id}-discounts`,
              category: 'Revenue',
              subcategory: 'Discounts & Allowances',
              metadata: {
                ...baseMetadata,
                transaction_type: 'discount',
              },
            });
          }
        }

        // Insert transactions
        if (transactions.length > 0) {
          const { error: insertError } = await supabase
            .from('transactions')
            .upsert(transactions, {
              onConflict: 'source_id,org_id',
            });

          if (insertError) {
            console.error('Error inserting order transactions:', insertError);
            throw insertError;
          }

          totalOrderTransactions = transactions.length;
        }

        // Mark orders as processed
        const orderIds = orders.map(o => o.id);
        const { error: updateError } = await supabase
          .from('shopify_orders')
          .update({ processed_at: new Date().toISOString() })
          .in('id', orderIds);

        if (updateError) {
          console.error('Error marking orders as processed:', updateError);
        }
      }
    }

    // Process Refunds
    if (processRefunds) {
      const { data: refunds, error: refundsError } = await supabase
        .from('shopify_refunds')
        .select('*')
        .eq('org_id', orgId)
        .is('processed_at', null) // Only unprocessed refunds
        .limit(batchSize);

      if (refundsError) {
        console.error('Error fetching refunds:', refundsError);
        throw refundsError;
      }

      if (refunds && refunds.length > 0) {
        const transactions = refunds.map(refund => ({
          org_id: orgId,
          date: refund.created_at,
          description: `Shopify Refund - Order #${refund.order_number}`,
          amount: -refund.refund_amount, // Negative for contra-revenue
          currency: 'USD',
          source: 'shopify',
          source_id: `refund-${refund.shopify_refund_id}`,
          category: 'Revenue',
          subcategory: 'Refunds & Returns',
          metadata: {
            shopify_refund_id: refund.shopify_refund_id,
            shopify_order_id: refund.shopify_order_id,
            order_number: refund.order_number,
            transaction_type: 'refund',
            refund_items_count: refund.refund_line_items?.length || 0,
          },
        }));

        // Insert transactions
        const { error: insertError } = await supabase
          .from('transactions')
          .upsert(transactions, {
            onConflict: 'source_id,org_id',
          });

        if (insertError) {
          console.error('Error inserting refund transactions:', insertError);
          throw insertError;
        }

        totalRefundTransactions = transactions.length;

        // Mark refunds as processed
        const refundIds = refunds.map(r => r.id);
        const { error: updateError } = await supabase
          .from('shopify_refunds')
          .update({ processed_at: new Date().toISOString() })
          .in('id', refundIds);

        if (updateError) {
          console.error('Error marking refunds as processed:', updateError);
        }
      }
    }

    console.log('Processing complete:', {
      orderTransactions: totalOrderTransactions,
      refundTransactions: totalRefundTransactions,
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderTransactions: totalOrderTransactions,
        refundTransactions: totalRefundTransactions,
        processedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});