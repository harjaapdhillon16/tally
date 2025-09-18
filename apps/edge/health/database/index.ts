import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    connected: boolean;
    rls_policies_active: boolean;
    service_role_permissions: boolean;
    error?: string;
  };
  environment: {
    has_supabase_url: boolean;
    has_service_role_key: boolean;
    has_required_functions: boolean;
  };
  timestamp: string;
}

serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      database: {
        connected: false,
        rls_policies_active: false,
        service_role_permissions: false,
      },
      environment: {
        has_supabase_url: !!Deno.env.get('SUPABASE_URL'),
        has_service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        has_required_functions: false,
      },
      timestamp: new Date().toISOString(),
    };

    // Check environment variables
    if (!healthCheck.environment.has_supabase_url || !healthCheck.environment.has_service_role_key) {
      healthCheck.status = 'unhealthy';
      healthCheck.database.error = 'Missing required environment variables';
      return Response.json(healthCheck, { status: 503 });
    }

    // Test database connection
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    try {
      // Test basic connection with a simple query
      const { error: connectionError } = await supabase
        .from('orgs')
        .select('count')
        .limit(1);

      if (connectionError) {
        healthCheck.database.error = `Connection failed: ${connectionError.message}`;
        healthCheck.status = 'unhealthy';
      } else {
        healthCheck.database.connected = true;
      }
    } catch (error) {
      healthCheck.database.error = `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      healthCheck.status = 'unhealthy';
    }

    // Test RLS policies are working correctly for service role
    if (healthCheck.database.connected) {
      try {
        // Test that user_in_org function exists and works with service role
        const { data, error } = await supabase.rpc('user_in_org', {
          target_org: '00000000-0000-0000-0000-000000000000' // Test UUID
        });

        if (error) {
          healthCheck.database.error = `RLS function test failed: ${error.message}`;
          healthCheck.status = 'degraded';
        } else {
          healthCheck.database.rls_policies_active = true;
        }
      } catch (error) {
        healthCheck.database.error = `RLS test error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        healthCheck.status = 'degraded';
      }
    }

    // Test service role permissions on critical tables
    if (healthCheck.database.connected) {
      try {
        // Test that service role can access connections table structure
        const { error: tableError } = await supabase
          .from('connections')
          .select('id')
          .limit(0); // Don't actually retrieve data, just test access

        if (tableError) {
          healthCheck.database.error = `Service role permissions test failed: ${tableError.message}`;
          healthCheck.status = 'degraded';
        } else {
          healthCheck.database.service_role_permissions = true;
        }
      } catch (error) {
        healthCheck.database.error = `Permissions test error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        healthCheck.status = 'degraded';
      }
    }

    // Test that audit functions exist
    if (healthCheck.database.connected) {
      try {
        const { error: auditError } = await supabase.rpc('log_service_role_operation', {
          p_table_name: 'health_check',
          p_operation: 'test',
          p_org_id: '00000000-0000-0000-0000-000000000000',
          p_user_id: null,
          p_edge_function: 'health-check'
        });

        if (auditError) {
          console.warn('Audit function test failed:', auditError.message);
          // Don't mark as unhealthy, audit is optional
        } else {
          healthCheck.environment.has_required_functions = true;
        }
      } catch (error) {
        console.warn('Audit function test error:', error);
      }
    }

    // Determine overall status
    if (healthCheck.database.connected &&
        healthCheck.database.rls_policies_active &&
        healthCheck.database.service_role_permissions) {
      healthCheck.status = 'healthy';
    } else if (healthCheck.database.connected) {
      healthCheck.status = 'degraded';
    } else {
      healthCheck.status = 'unhealthy';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'degraded' ? 206 : 503;

    return Response.json(healthCheck, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    const errorResponse: HealthCheckResult = {
      status: 'unhealthy',
      database: {
        connected: false,
        rls_policies_active: false,
        service_role_permissions: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      environment: {
        has_supabase_url: !!Deno.env.get('SUPABASE_URL'),
        has_service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        has_required_functions: false,
      },
      timestamp: new Date().toISOString(),
    };

    console.error('Health check error:', error);

    return Response.json(errorResponse, {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
});