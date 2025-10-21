import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptAccessToken } from '../../_shared/encryption.ts';

/**
 * Store Shopify connection and encrypted access token
 * Called by OAuth callback after token exchange
 */
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { orgId, shop, accessToken, scopes } = await req.json();

    if (!orgId || !shop || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: orgId, shop, accessToken' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Storing Shopify connection:', {
      orgId,
      shop,
      scopes,
    });

    // Create connection record
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .upsert({
        org_id: orgId,
        provider: 'shopify',
        provider_item_id: shop, // Use shop domain as item ID
        institution_id: shop, // Store shop domain for reference
        institution_name: shop.replace('.myshopify.com', ''), // Display name
        status: 'active',
        scopes: scopes || ['read_orders', 'read_all_orders'],
      }, {
        onConflict: 'org_id,provider,provider_item_id'
      })
      .select('id')
      .single();

    if (connectionError || !connection) {
      console.error('Failed to create connection:', {
        error: connectionError,
        orgId,
        shop,
      });
      throw new Error(`Failed to create connection: ${connectionError?.message || 'Unknown error'}`);
    }

    // Encrypt and store access token
    const encryptedToken = await encryptAccessToken(accessToken);
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
      });
      throw new Error(`Failed to store access token: ${secretError.message}`);
    }

    console.log('Shopify connection stored successfully:', {
      connectionId: connection.id,
      orgId,
      shop,
    });

    return new Response(
      JSON.stringify({
        success: true,
        connectionId: connection.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Store connection error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to store connection',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

