import type { NextRequest } from "next/server";

/**
 * Shopify OAuth callback endpoint
 * Exchanges authorization code for access token and stores connection
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('Shopify OAuth error:', error);
      return Response.redirect(
        new URL(`/settings/connections?error=${encodeURIComponent(error)}`, request.url)
      );
    }
    
    // Validate required parameters
    if (!code || !shop || !state) {
      console.error('Missing OAuth parameters:', { hasCode: !!code, hasShop: !!shop, hasState: !!state });
      return Response.redirect(
        new URL('/settings/connections?error=missing_parameters', request.url)
      );
    }
    
    // Verify state and extract orgId
    let orgId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      orgId = stateData.orgId;
      
      // Optional: Verify timestamp to prevent replay attacks (e.g., within 10 minutes)
      const age = Date.now() - stateData.timestamp;
      if (age > 10 * 60 * 1000) {
        console.warn('OAuth state expired:', { age });
        return Response.redirect(
          new URL('/settings/connections?error=state_expired', request.url)
        );
      }
    } catch (stateError) {
      console.error('Invalid OAuth state:', stateError);
      return Response.redirect(
        new URL('/settings/connections?error=invalid_state', request.url)
      );
    }
    
    const shopifyApiKey = process.env.SHOPIFY_API_KEY;
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET;
    
    if (!shopifyApiKey || !shopifyApiSecret) {
      console.error('Missing Shopify credentials');
      return Response.redirect(
        new URL('/settings/connections?error=config_missing', request.url)
      );
    }
    
    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: shopifyApiKey,
        client_secret: shopifyApiSecret,
        code,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Shopify token exchange failed:', {
        status: tokenResponse.status,
        error: errorText,
      });
      return Response.redirect(
        new URL('/settings/connections?error=token_exchange_failed', request.url)
      );
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const scopes = tokenData.scope;
    
    if (!accessToken) {
      console.error('No access token in response:', tokenData);
      return Response.redirect(
        new URL('/settings/connections?error=no_access_token', request.url)
      );
    }
    
    console.log('Shopify token exchange successful:', {
      shop,
      scopes,
      orgId,
    });
    
    // Store connection via Edge Function (has service role access)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const storeResponse = await fetch(`${supabaseUrl}/functions/v1/shopify-store-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        orgId,
        shop,
        accessToken,
        scopes: scopes.split(','),
      }),
    });
    
    if (!storeResponse.ok) {
      const errorText = await storeResponse.text();
      console.error('Failed to store Shopify connection:', {
        status: storeResponse.status,
        error: errorText,
      });
      return Response.redirect(
        new URL('/settings/connections?error=store_connection_failed', request.url)
      );
    }
    
    // Success - redirect to connections page
    return Response.redirect(
      new URL('/settings/connections?success=shopify_connected', request.url)
    );
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    return Response.redirect(
      new URL('/settings/connections?error=callback_failed', request.url)
    );
  }
}

