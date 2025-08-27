import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withOrgFromJWT } from '../../_shared/with-org.ts';
import { trackConnection, captureException } from '../../_shared/monitoring.ts';

const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')!;
const PLAID_SECRET = Deno.env.get('PLAID_SECRET')!;
const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const jwt = authorization.replace('Bearer ', '');
    const { userId, orgId } = await withOrgFromJWT(jwt);

    const { public_token, metadata } = await req.json();

    // Exchange public token for access token
    const plaidResponse = await fetch(`https://${PLAID_ENV}.plaid.com/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({ public_token }),
    });

    if (!plaidResponse.ok) {
      throw new Error('Plaid exchange failed');
    }

    const { access_token, item_id } = await plaidResponse.json();

    // Store in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Create connection record
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .upsert({
        org_id: orgId,
        provider: 'plaid',
        provider_item_id: item_id,
        status: 'active',
        scopes: ['transactions'],
      }, {
        onConflict: 'org_id,provider,provider_item_id'
      })
      .select('id')
      .single();

    if (connectionError || !connection) {
      throw new Error('Failed to create connection');
    }

    // Store encrypted access token using proper AES-GCM encryption
    const { encryptAccessToken } = await import('../../_shared/encryption.ts');
    const encryptedToken = await encryptAccessToken(access_token);
    const { error: secretError } = await supabase
      .from('connection_secrets')
      .upsert({
        connection_id: connection.id,
        access_token_encrypted: encryptedToken,
      });

    if (secretError) {
      throw new Error('Failed to store access token');
    }

    // Track successful connection
    await trackConnection('connected', connection.id, 'plaid', orgId);

    // Trigger immediate account sync
    await fetch(Deno.env.get('SUPABASE_URL')! + '/functions/v1/plaid/sync-accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ connectionId: connection.id }),
    });

    return new Response(JSON.stringify({ connectionId: connection.id }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Exchange error:', error);
    await captureException(error as Error, 'error', {
      tags: { operation: 'plaid_exchange' },
    });
    return new Response(JSON.stringify({ error: 'Exchange failed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});