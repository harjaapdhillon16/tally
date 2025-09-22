import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { createPlaidClient, safelyCallPlaid } from '../../_shared/plaid-client.ts';

// JWT-based webhook verification for Plaid (ES256)
async function verifyPlaidWebhookJWT(
  body: string,
  jwtToken: string
): Promise<boolean> {
  try {
    // Decode JWT header to get key ID
    const headerPart = jwtToken.split('.')[0];
    const headerBuffer = Uint8Array.from(atob(headerPart), c => c.charCodeAt(0));
    const header = JSON.parse(new TextDecoder().decode(headerBuffer));
    
    if (header.alg !== 'ES256') {
      console.error('Invalid JWT algorithm, expected ES256:', header.alg);
      return false;
    }

    const keyId = header.kid;
    if (!keyId) {
      console.error('Missing key ID in JWT header');
      return false;
    }

    // Get verification key from Plaid
    const client = createPlaidClient();
    const keyResponse = await safelyCallPlaid(
      async () => {
        const response = await fetch(`${client.baseUrl}/webhook_verification_key/get`, {
          method: 'POST',
          headers: client.headers,
          body: JSON.stringify({ key_id: keyId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      },
      'getWebhookVerificationKey'
    );

    const jwk = keyResponse.key;

    // Import the JWK for verification
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      {
        kty: jwk.kty,
        crv: jwk.crv,
        x: jwk.x,
        y: jwk.y,
        use: jwk.use,
        alg: jwk.alg
      },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    // Split JWT into components
    const [headerB64, payloadB64, signatureB64] = jwtToken.split('.');
    const signedContent = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    
    // Decode signature from base64url
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

    // Verify signature
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      signature,
      signedContent
    );

    if (!isValid) {
      console.error('JWT signature verification failed');
      return false;
    }

    // Decode and verify payload
    const payloadBuffer = Uint8Array.from(atob(payloadB64), c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(payloadBuffer));

    // Verify body hash
    const bodyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
    const bodyHashHex = Array.from(new Uint8Array(bodyHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (payload.request_body_sha256 !== bodyHashHex) {
      console.error('Body hash mismatch');
      return false;
    }

    // Verify timestamp (max 5 minutes old)
    const now = Math.floor(Date.now() / 1000);
    if (payload.iat && (now - payload.iat) > 300) {
      console.error('JWT token too old');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Plaid JWT verification error:', error);
    return false;
  }
}

// Legacy HMAC verification (kept for backward compatibility)
async function verifyWebhookSignature(
  body: string, 
  signature: string, 
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

    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const providedHex = signature.replace('sha256=', '');
    
    return expectedHex === providedHex;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    
    // Verify webhook signature using JWT in production, optional in development
    const plaidEnv = Deno.env.get('PLAID_ENV') || Deno.env.get('ENVIRONMENT') || 'development';
    const isProduction = plaidEnv === 'production';
    
    // Get JWT token from Plaid-Verification header
    const jwtToken = req.headers.get('plaid-verification');
    
    if (isProduction) {
      // In production, JWT verification is required
      if (!jwtToken) {
        console.error('Missing Plaid-Verification header in production');
        return new Response('Unauthorized', { status: 401 });
      }
      
      const isValid = await verifyPlaidWebhookJWT(rawBody, jwtToken);
      if (!isValid) {
        // Parse webhook for minimal logging - no payload echo
        try {
          const webhookData = JSON.parse(rawBody);
          console.warn('Invalid JWT signature', {
            webhook_type: webhookData.webhook_type,
            webhook_code: webhookData.webhook_code,
            request_id: webhookData.request_id
          });
        } catch {
          console.warn('Invalid JWT signature - unparseable payload');
        }
        return new Response('Unauthorized', { status: 401 });
      }
    } else {
      // In development/sandbox, JWT verification is optional
      if (jwtToken) {
        const isValid = await verifyPlaidWebhookJWT(rawBody, jwtToken);
        if (!isValid) {
          console.warn('JWT verification failed in development - continuing anyway');
        } else {
          console.log('JWT verification successful in development');
        }
      } else {
        console.warn('No JWT token provided in development - continuing without verification');
      }
    }

    const webhook = JSON.parse(rawBody);
    
    console.log('Plaid webhook received:', webhook.webhook_type, webhook.webhook_code);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    switch (webhook.webhook_type) {
      case 'TRANSACTIONS':
        // Handle modern SYNC_UPDATES_AVAILABLE webhook for /transactions/sync
        if (webhook.webhook_code === 'SYNC_UPDATES_AVAILABLE') {
          // Find connection by item_id
          const { data: connection } = await supabase
            .from('connections')
            .select('id')
            .eq('provider', 'plaid')
            .eq('provider_item_id', webhook.item_id)
            .single();

          if (connection) {
            console.log('SYNC_UPDATES_AVAILABLE received for connection:', connection.id, {
              initial_update_complete: webhook.initial_update_complete,
              historical_update_complete: webhook.historical_update_complete
            });

            // Trigger async sync using /transactions/sync
            fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-sync-transactions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ connectionId: connection.id }),
            }).catch((error) => {
              console.error('Webhook transaction sync failed:', {
                connectionId: connection.id,
                error: error.message || error
              });
            }); // Fire and forget
          }
        }
        // Legacy webhook support for backwards compatibility (for /transactions/get)
        else if (webhook.webhook_code === 'DEFAULT_UPDATE' || 
                 webhook.webhook_code === 'HISTORICAL_UPDATE' ||
                 webhook.webhook_code === 'INITIAL_UPDATE') {
          
          console.log('Legacy webhook received:', webhook.webhook_code, '- consider migrating to SYNC_UPDATES_AVAILABLE');
          
          // Find connection by item_id
          const { data: connection } = await supabase
            .from('connections')
            .select('id')
            .eq('provider', 'plaid')
            .eq('provider_item_id', webhook.item_id)
            .single();

          if (connection) {
            // Trigger async sync
            fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-sync-transactions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({ connectionId: connection.id }),
            }).catch((error) => {
              console.error('Webhook transaction sync failed:', {
                connectionId: connection.id,
                error: error.message || error
              });
            }); // Fire and forget
          }
        } else if (webhook.webhook_code === 'TRANSACTIONS_REMOVED') {
          // Handle removed transactions - for now just log
          console.log('TRANSACTIONS_REMOVED webhook received:', webhook.item_id);
        }
        break;

      case 'ITEM':
        if (webhook.webhook_code === 'ERROR') {
          // Mark connection as errored
          await supabase
            .from('connections')
            .update({ status: 'error' })
            .eq('provider', 'plaid')
            .eq('provider_item_id', webhook.item_id);
        }
        break;
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
});