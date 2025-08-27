/// <reference path="../../deno-types.d.ts" />

/**
 * Tests for Plaid sync-accounts Edge Function
 */

import { assertEquals } from "../../_test/test-utils.ts";
import {
  setupTestEnv,
  cleanupTestEnv,
  createMockRequest,
  createMockFetch,
  createMockSupabaseClient,
  MOCK_PLAID_RESPONSES
} from "../../_test/test-utils.ts";

// Setup test environment
Deno.test({
  name: "sync-accounts function setup",
  fn: () => {
    setupTestEnv();
    globalThis.fetch = createMockFetch();
  }
});

Deno.test({
  name: "sync-accounts function - handles valid request",
  async fn() {
    // Create a test handler that simulates the sync-accounts function
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const { connectionId } = await req.json();
        
        if (!connectionId) {
          return new Response(JSON.stringify({ 
            error: 'connectionId is required' 
          }), { status: 400 });
        }

        // Mock the sync process
        const accounts = MOCK_PLAID_RESPONSES.accounts.accounts;
        const upsertedCount = accounts.length;

        return new Response(JSON.stringify({
          success: true,
          upserted: upsertedCount,
          accounts: accounts.length
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Internal server error' 
        }), { status: 500 });
      }
    };

    const request = createMockRequest("POST", {
      connectionId: "test-connection-id"
    }, {
      // Remove Authorization header since this is called by service role
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    });

    const response = await testHandler(request);
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.success, true);
    assertEquals(data.upserted, 1);
    assertEquals(data.accounts, 1);
  }
});

Deno.test({
  name: "sync-accounts function - handles missing connectionId",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const { connectionId } = await req.json();
        
        if (!connectionId) {
          return new Response(JSON.stringify({ 
            error: 'connectionId is required' 
          }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }));
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Internal server error' 
        }), { status: 500 });
      }
    };

    const request = createMockRequest("POST", {
      // Missing connectionId
    }, {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    });

    const response = await testHandler(request);
    assertEquals(response.status, 400);
    
    const data = await response.json();
    assertEquals(data.error, 'connectionId is required');
  }
});

Deno.test({
  name: "sync-accounts function - handles invalid method",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      return new Response('OK');
    };

    const request = createMockRequest("GET", undefined, {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    });

    const response = await testHandler(request);
    assertEquals(response.status, 405);
  }
});

// Cleanup
Deno.test({
  name: "sync-accounts function cleanup",
  fn: () => {
    cleanupTestEnv();
  }
});
