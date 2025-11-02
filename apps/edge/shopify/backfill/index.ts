import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getConnectionWithSecrets } from '../../_shared/database.ts';
import { decryptAccessToken } from '../../_shared/encryption.ts';
import { transformOrderToTransactions, isOrderPaid } from '../../_shared/shopify-transform.ts';
import { upsertTransactions } from '../../_shared/transaction-service.ts';

/**
 * Execute Shopify GraphQL query
 */
async function shopifyGraphQL(
  shop: string,
  accessToken: string,
  query: string,
  variables?: any
): Promise<any> {
  const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphQL request failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
  
  return result.data;
}

/**
 * Start a bulk operation to fetch historical orders
 */
async function startBulkOperation(
  shop: string,
  accessToken: string,
  daysBack: number
): Promise<string> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const dateFilter = startDate.toISOString();
  
  // GraphQL bulk query for orders with refunds
  const query = `
    mutation {
      bulkOperationRunQuery(
        query: """
        {
          orders(query: "processed_at:>='${dateFilter}' AND financial_status:paid") {
            edges {
              node {
                id
                name
                processedAt
                financialStatus
                currency: currencyCode
                currentSubtotalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                totalShippingPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                totalDiscountsSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                totalTaxSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                refunds {
                  id
                  createdAt
                  totalRefundedSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
        """
      ) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  const data = await shopifyGraphQL(shop, accessToken, query);
  
  if (data.bulkOperationRunQuery.userErrors?.length > 0) {
    throw new Error(`Bulk operation errors: ${JSON.stringify(data.bulkOperationRunQuery.userErrors)}`);
  }
  
  return data.bulkOperationRunQuery.bulkOperation.id;
}

/**
 * Poll bulk operation status
 */
async function pollBulkOperation(
  shop: string,
  accessToken: string,
  operationId: string,
  maxAttempts = 60
): Promise<string | null> {
  const query = `
    query {
      currentBulkOperation {
        id
        status
        errorCode
        objectCount
        fileSize
        url
      }
    }
  `;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await shopifyGraphQL(shop, accessToken, query);
    const operation = data.currentBulkOperation;
    
    if (!operation || operation.id !== operationId) {
      console.log('Bulk operation not found or changed:', { operationId, current: operation?.id });
      return null;
    }
    
    console.log('Bulk operation status:', {
      status: operation.status,
      objectCount: operation.objectCount,
      fileSize: operation.fileSize,
      attempt: attempt + 1,
    });
    
    if (operation.status === 'COMPLETED') {
      return operation.url;
    }
    
    if (operation.status === 'FAILED' || operation.status === 'CANCELED') {
      throw new Error(`Bulk operation ${operation.status}: ${operation.errorCode}`);
    }
    
    // Wait before next poll (exponential backoff)
    const delay = Math.min(1000 * Math.pow(1.5, attempt), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error('Bulk operation timeout');
}

/**
 * Download and process bulk operation results
 */
async function processBulkResults(
  url: string,
  orgId: string
): Promise<{ inserted: number; orders: number; refunds: number }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download bulk results: ${response.status}`);
  }
  
  const text = await response.text();
  const lines = text.trim().split('\n');
  
  let inserted = 0;
  let orderCount = 0;
  let refundCount = 0;
  const batchSize = 100;
  let batch: any[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const record = JSON.parse(line);
      
      // Process orders
      if (record.__typename === 'Order') {
        const transactions = transformOrderToTransactions(record, orgId);
        batch.push(...transactions);
        orderCount++;
      }
      
      // Process refunds (nested in order results)
      if (record.__typename === 'Refund' && record.__parentId) {
        const orderId = record.__parentId.split('/').pop();
        const refundTransactions = transformOrderToTransactions(record, orgId);
        batch.push(...refundTransactions);
        refundCount++;
      }
      
      // Upsert in batches
      if (batch.length >= batchSize) {
        const count = await upsertTransactions(batch);
        inserted += count;
        console.log(`Batch upserted: ${count} transactions`);
        batch = [];
      }
    } catch (parseError) {
      console.error('Failed to parse line:', parseError, line.slice(0, 100));
    }
  }
  
  // Upsert remaining batch
  if (batch.length > 0) {
    const count = await upsertTransactions(batch);
    inserted += count;
    console.log(`Final batch upserted: ${count} transactions`);
  }
  
  return { inserted, orders: orderCount, refunds: refundCount };
}

/**
 * Shopify backfill handler
 * Fetches historical orders and refunds using GraphQL Bulk Operations
 */
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { connectionId, daysBack = 180 } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'connectionId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Shopify backfill:', { connectionId, daysBack });

    // Get connection and decrypt token
    const connection = await getConnectionWithSecrets(connectionId);
    const accessToken = await decryptAccessToken(connection.access_token_encrypted);
    const shop = connection.provider_item_id; // Shop domain
    const orgId = connection.org_id;

    // Start bulk operation
    console.log('Starting bulk operation for shop:', shop);
    const operationId = await startBulkOperation(shop, accessToken, daysBack);
    console.log('Bulk operation started:', operationId);

    // Poll until complete
    const resultUrl = await pollBulkOperation(shop, accessToken, operationId);
    
    if (!resultUrl) {
      throw new Error('No result URL from bulk operation');
    }

    console.log('Bulk operation completed, processing results...');

    // Download and process results
    const result = await processBulkResults(resultUrl, orgId);

    console.log('Backfill complete:', result);

    // Trigger categorization for any uncategorized transactions
    if (result.inserted > 0) {
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
              maxBatches: 20,
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
        ...result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({
        error: 'Backfill failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});




