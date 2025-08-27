import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { syncTransactionsForConnection } from '../../_shared/transaction-service.ts';
import { PlaidApiError } from '../../_shared/plaid-client.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'connectionId is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await syncTransactionsForConnection(connectionId);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Transaction sync error:', error);

    if (error instanceof PlaidApiError) {
      return new Response(JSON.stringify({ 
        error: 'Plaid API error',
        code: error.code,
        message: error.message 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Transaction sync failed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});