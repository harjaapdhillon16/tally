import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { transformOrderToTransactions, transformRefundToTransactions, isOrderPaid } from '../../_shared/shopify-transform.ts';
import { upsertTransactions } from '../../_shared/transaction-service.ts';

/**
 * Verify Shopify webhook HMAC signature
 * Uses X-Shopify-Hmac-Sha256 header
 */
async function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(rawBody)
    );
    
    // Convert to base64
    const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    // Constant-time comparison (basic implementation)
    if (expected.length !== hmacHeader.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Shopify webhook handler
 * Processes orders/paid and refunds/create events
 */
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    
    // Extract Shopify headers
    const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256');
    const topic = req.headers.get('X-Shopify-Topic');
    const shop = req.headers.get('X-Shopify-Shop-Domain');
    const webhookId = req.headers.get('X-Shopify-Webhook-Id');
    
    console.log('Shopify webhook received:', {
      topic,
      shop,
      webhookId,
      hasHmac: !!hmacHeader,
    });
    
    // Verify HMAC signature
    const shopifySecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!shopifySecret) {
      console.error('SHOPIFY_API_SECRET not configured');
      return new Response('Server configuration error', { status: 500 });
    }
    
    if (!hmacHeader) {
      console.error('Missing HMAC header');
      return new Response('Unauthorized', { status: 401 });
    }
    
    const isValid = await verifyShopifyWebhook(rawBody, hmacHeader, shopifySecret);
    if (!isValid) {
      console.warn('Invalid HMAC signature', {
        topic,
        shop,
        webhookId,
      });
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Find connection by shop domain
    const { data: connection } = await supabase
      .from('connections')
      .select('id, org_id')
      .eq('provider', 'shopify')
      .eq('provider_item_id', shop)
      .eq('status', 'active')
      .single();
    
    if (!connection) {
      console.warn('No active connection found for shop:', shop);
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const orgId = connection.org_id;
    let transactions: any[] = [];
    
    // Route by topic
    switch (topic) {
      case 'orders/paid': {
        // Only process if order is actually paid
        if (!isOrderPaid(payload)) {
          console.log('Order not in paid state, skipping:', {
            orderId: payload.id,
            financialStatus: payload.financial_status,
          });
          return new Response(
            JSON.stringify({ message: 'Order not paid, skipped' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        transactions = transformOrderToTransactions(payload, orgId);
        console.log('Processing order:', {
          orderId: payload.id,
          orderName: payload.name,
          transactionCount: transactions.length,
          orgId,
        });
        break;
      }
      
      case 'refunds/create': {
        const orderId = payload.order_id?.toString();
        transactions = transformRefundToTransactions(payload, orgId, orderId);
        console.log('Processing refund:', {
          refundId: payload.id,
          orderId,
          transactionCount: transactions.length,
          orgId,
        });
        break;
      }
      
      // Future webhook topics (payments, payouts) can be added here
      case 'order_transactions/create':
      case 'shopify_payments/payouts/paid':
        console.log('Webhook topic not yet implemented:', topic);
        return new Response(
          JSON.stringify({ message: 'Topic not implemented' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      
      default:
        console.warn('Unknown webhook topic:', topic);
        return new Response(
          JSON.stringify({ message: 'Unknown topic' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    // Upsert transactions
    if (transactions.length > 0) {
      const upserted = await upsertTransactions(transactions);
      console.log('Transactions upserted:', {
        count: upserted,
        orgId,
        topic,
      });
      
      // Optionally trigger categorization (though we set categories at ingestion)
      // Only trigger if we have uncategorized transactions
      const uncategorized = transactions.filter(tx => !tx.category_id);
      if (uncategorized.length > 0) {
        try {
          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/jobs-categorize-queue`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                orgId,
                maxBatches: 5,
              }),
            }
          ).catch(err => {
            console.error('Failed to trigger categorization:', err);
          });
        } catch (error) {
          console.error('Categorization trigger error:', error);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          upserted,
          topic,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ message: 'No transactions to process' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});




