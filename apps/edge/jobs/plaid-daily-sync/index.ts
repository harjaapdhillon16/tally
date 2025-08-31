/// <reference path="../../deno-types.d.ts" />
// @ts-ignore: Deno module resolution
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno module resolution  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all active Plaid connections
    const { data: connections, error } = await supabase
      .from('connections')
      .select('id, org_id')
      .eq('provider', 'plaid')
      .eq('status', 'active');

    if (error || !connections) {
      throw new Error('Failed to fetch connections');
    }

    const results: Array<{
      connectionId: string;
      orgId?: string;
      accounts?: any;
      transactions?: any;
      error?: string;
    }> = [];

    for (const connection of connections) {
      try {
        // First sync accounts to update balances
        const accountSyncResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid/sync-accounts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ connectionId: connection.id }),
          }
        );

        const accountResult = await accountSyncResponse.json();
        
        // Then sync transactions
        const syncResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid/sync-transactions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ connectionId: connection.id }),
          }
        );

        const transactionResult = await syncResponse.json();
        results.push({
          connectionId: connection.id,
          orgId: connection.org_id,
          accounts: accountResult,
          transactions: transactionResult,
        });

        // Log to PostHog for monitoring
        // TODO: Add PostHog logging here once analytics are set up

      } catch (error: any) {
        console.error(`Sync failed for connection ${connection.id}:`, error);
        results.push({
          connectionId: connection.id,
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({ 
      processed: connections.length,
      results 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Daily sync job error:', error);
    return new Response(JSON.stringify({ error: 'Daily sync failed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});