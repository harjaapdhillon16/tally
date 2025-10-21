import type { NextRequest } from "next/server";
import { withOrgFromRequest } from "@/lib/api/with-org";

/**
 * Shopify OAuth start endpoint
 * Redirects user to Shopify OAuth authorization page
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await withOrgFromRequest(request);
    
    const shopifyApiKey = process.env.SHOPIFY_API_KEY;
    const shopifyAppHost = process.env.SHOPIFY_APP_HOST;
    
    if (!shopifyApiKey || !shopifyAppHost) {
      console.error('Missing Shopify configuration:', {
        hasApiKey: !!shopifyApiKey,
        hasAppHost: !!shopifyAppHost,
      });
      return Response.redirect(
        new URL('/settings/connections?error=shopify_config_missing', request.url)
      );
    }
    
    // Get shop parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');
    
    if (!shop) {
      return new Response(
        JSON.stringify({ error: 'Missing shop parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate shop domain format (basic validation)
    if (!shop.endsWith('.myshopify.com') && !shop.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Invalid shop domain' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Build OAuth URL
    const scopes = 'read_orders,read_all_orders'; // read_all_orders for >60 day history
    const redirectUri = `${shopifyAppHost}/api/shopify/oauth/callback`;
    
    // Generate state for CSRF protection (include orgId)
    const state = Buffer.from(JSON.stringify({ orgId, timestamp: Date.now() })).toString('base64');
    
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', shopifyApiKey);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('grant_options[]', 'offline'); // Request offline access token
    
    console.log('Redirecting to Shopify OAuth:', {
      shop,
      scopes,
      orgId,
      redirectUri,
    });
    
    return Response.redirect(authUrl.toString());
  } catch (error) {
    console.error('Shopify OAuth start error:', error);
    return Response.redirect(
      new URL('/settings/connections?error=oauth_start_failed', request.url)
    );
  }
}

