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

    // Create connection record with enhanced error handling
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
      console.error('Database connection creation failed:', {
        error: connectionError,
        orgId,
        itemId: item_id,
        userId,
        authContext: {
          hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          jwtRole: 'service_role' // Edge Functions use service role
        }
      });

      // Log the operation attempt for audit trail
      try {
        await supabase.rpc('log_service_role_operation', {
          p_table_name: 'connections',
          p_operation: 'upsert_failed',
          p_org_id: orgId,
          p_user_id: userId,
          p_edge_function: 'plaid-exchange'
        });
      } catch (auditError) {
        console.warn('Failed to log audit entry:', auditError);
      }

      throw new Error(`Failed to create connection: ${connectionError?.message || 'Unknown database error'}`);
    }

    // Log successful connection creation for audit trail
    try {
      await supabase.rpc('log_service_role_operation', {
        p_table_name: 'connections',
        p_operation: 'upsert_success',
        p_org_id: orgId,
        p_user_id: userId,
        p_edge_function: 'plaid-exchange'
      });
    } catch (auditError) {
      console.warn('Failed to log audit entry:', auditError);
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
      console.error('Failed to store access token:', {
        error: secretError,
        connectionId: connection.id,
        orgId,
        userId
      });

      // Log the failed secret storage for audit trail
      try {
        await supabase.rpc('log_service_role_operation', {
          p_table_name: 'connection_secrets',
          p_operation: 'upsert_failed',
          p_org_id: orgId,
          p_user_id: userId,
          p_edge_function: 'plaid-exchange'
        });
      } catch (auditError) {
        console.warn('Failed to log audit entry:', auditError);
      }

      throw new Error(`Failed to store access token: ${secretError.message || 'Unknown error'}`);
    }

    // Track successful connection
    await trackConnection('connected', connection.id, 'plaid', orgId);

    // Trigger immediate account sync
    const accountSyncResponse = await fetch(Deno.env.get('SUPABASE_URL')! + '/functions/v1/plaid-sync-accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ connectionId: connection.id }),
    });

    if (!accountSyncResponse.ok) {
      console.error('Account sync failed:', {
        status: accountSyncResponse.status,
        statusText: accountSyncResponse.statusText,
        connectionId: connection.id
      });
      // Continue execution - account sync can be retried later
    }

    // Initialize transactions sync to bootstrap SYNC_UPDATES_AVAILABLE webhooks
    // This initial call may return no transactions but enables the webhook
    fetch(Deno.env.get('SUPABASE_URL')! + '/functions/v1/plaid-sync-transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ connectionId: connection.id }),
    }).catch((error) => {
      console.error('Initial transaction sync failed:', {
        connectionId: connection.id,
        error: error.message || error
      });
      // Don't fail the connection creation if initial sync fails
    }); // Fire and forget

    return new Response(JSON.stringify({ connectionId: connection.id }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Exchange error:', error);

    // Enhanced error logging with context
    console.error('Full error context:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      environment: {
        hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        hasPlaidCredentials: !!Deno.env.get('PLAID_CLIENT_ID') && !!Deno.env.get('PLAID_SECRET')
      }
    });

    await captureException(error as Error, 'error', {
      tags: {
        operation: 'plaid_exchange',
        error_type: error instanceof Error ? error.name : 'unknown'
      },
      extra: {
        hasRequiredEnvVars: {
          supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
          serviceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          plaidCredentials: !!Deno.env.get('PLAID_CLIENT_ID')
        }
      }
    });

    return new Response(JSON.stringify({
      error: 'Exchange failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});