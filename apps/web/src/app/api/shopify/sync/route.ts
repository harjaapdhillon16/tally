import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase";

/**
 * Shopify data sync endpoint
 * Triggers historical data fetch from Shopify (orders and refunds)
 * 
 * POST /api/shopify/sync
 * Body: {
 *   syncMode?: 'full' | 'incremental',
 *   startDate?: string,
 *   endDate?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return Response.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      console.error('Organization error:', orgError);
      return Response.json(
        { 
          error: 'No organization found. Please set up your organization first.',
          details: 'You need to be part of an organization to sync Shopify data.'
        },
        { status: 400 }
      );
    }

    const orgId = orgMember.org_id;
    const body = await request.json();
    const { syncMode = 'incremental', startDate, endDate } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return Response.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('Triggering Shopify sync:', {
      orgId,
      syncMode,
      startDate,
      endDate,
    });

    // Call Edge Function to perform sync
    const syncResponse = await fetch(
      `${supabaseUrl}/functions/v1/shopify-sync-orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          orgId,
          syncMode,
          startDate,
          endDate,
        }),
      }
    );

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('Shopify sync failed:', {
        status: syncResponse.status,
        error: errorText,
      });
      return Response.json(
        { error: 'Failed to sync Shopify data', details: errorText },
        { status: syncResponse.status }
      );
    }

    const result = await syncResponse.json();

    console.log('Shopify sync completed:', result);

    return Response.json({
      success: true,
      message: 'Shopify data synced successfully',
      ...result,
    });
  } catch (error) {
    console.error('Shopify sync error:', error);
    return Response.json(
      { 
        error: 'Failed to sync Shopify data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get sync status
 * 
 * GET /api/shopify/sync
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return Response.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      console.error('Organization not found:', orgError);
      // Return a friendly response indicating no org
      return Response.json({
        connected: false,
        message: 'No organization found. Please set up your organization first.',
        needsSetup: true,
      });
    }

    const orgId = orgMember.org_id;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Fetch connection status
    const { data: connections, error: connError } = await supabase
      .from('shopify_connections')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true);

    if (connError) {
      console.error('Error fetching connections:', connError);
      return Response.json(
        { error: 'Failed to fetch connection status' },
        { status: 500 }
      );
    }
    
    if (!connections || connections.length === 0) {
      return Response.json({
        connected: false,
        message: 'No active Shopify connection found. Please connect your Shopify store first.',
      });
    }

    const connection = connections[0];

    // Fetch sync statistics
    const { count: ordersCount, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    const { count: refundsCount, error: refundsError } = await supabase
      .from('shopify_refunds')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if (ordersError) console.error('Error counting orders:', ordersError);
    if (refundsError) console.error('Error counting refunds:', refundsError);

    return Response.json({
      connected: true,
      shopDomain: connection.shop_domain,
      lastSyncedAt: connection.last_synced_at,
      ordersCount: ordersCount || 0,
      refundsCount: refundsCount || 0,
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return Response.json(
      { 
        error: 'Failed to fetch sync status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}