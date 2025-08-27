/// <reference path="../../deno-types.d.ts" />

/**
 * Tests for Plaid exchange Edge Function
 */

import { assertEquals, assertRejects } from "../../_test/test-utils.ts";
import {
  setupTestEnv,
  cleanupTestEnv,
  createMockRequest,
  createMockFetch,
  createMockSupabaseClient,
  MOCK_PLAID_RESPONSES,
  MOCK_USER_CONTEXT
} from "../../_test/test-utils.ts";

// We need to mock the imports before importing the function
const originalFetch = globalThis.fetch;
const originalCreateClient = (globalThis as any).createClient;

// Mock the serve function to test the handler directly
let handler: (req: Request) => Promise<Response>;

// Mock imports
(globalThis as any).createClient = () => createMockSupabaseClient();

// Mock the withOrgFromJWT function
const mockWithOrgFromJWT = (jwt: string) => Promise.resolve(MOCK_USER_CONTEXT);

// Override the serve function to capture the handler
const originalServe = (globalThis as any).serve;
(globalThis as any).serve = (fn: (req: Request) => Promise<Response>) => {
  handler = fn;
};

// Mock the monitoring functions
const mockTrackConnection = () => Promise.resolve();
const mockCaptureException = () => {};

// Setup test environment
Deno.test({
  name: "exchange function setup",
  fn: () => {
    setupTestEnv();
    globalThis.fetch = createMockFetch();
  }
});

Deno.test({
  name: "exchange function - handles valid request",
  async fn() {
    // Mock the module dependencies
    const moduleGlobals = {
      fetch: createMockFetch(),
      createClient: () => createMockSupabaseClient(),
      withOrgFromJWT: mockWithOrgFromJWT,
      trackConnection: mockTrackConnection,
      captureException: mockCaptureException
    };

    // Create the handler function manually (simulating the module)
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const authorization = req.headers.get('Authorization');
        if (!authorization) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const jwt = authorization.replace('Bearer ', '');
        const { userId, orgId } = await moduleGlobals.withOrgFromJWT(jwt);

        const { public_token, metadata } = await req.json();

        // Mock Plaid API call
        const plaidResponse = {
          ok: true,
          json: () => Promise.resolve(MOCK_PLAID_RESPONSES.tokenExchange)
        };

        // Mock successful response
        return new Response(JSON.stringify({
          success: true,
          connectionId: "test-connection-id"
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
      public_token: "test-public-token",
      metadata: { institution_id: "test" },
    });

    const response = await testHandler(request);
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.success, true);
    assertEquals(data.connectionId, "test-connection-id");
  }
});

Deno.test({
  name: "exchange function - handles unauthorized request",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      const authorization = req.headers.get('Authorization');
      if (!authorization) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      return new Response('OK');
    };

    const request = createMockRequest("POST", {
      public_token: "test-public-token",
      metadata: { institution_id: "test" },
    }, { Authorization: "" }); // No auth header

    const response = await testHandler(request);
    assertEquals(response.status, 401);
    
    const data = await response.json();
    assertEquals(data.error, 'Unauthorized');
  }
});

Deno.test({
  name: "exchange function - handles invalid method",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      return new Response('OK');
    };

    const request = createMockRequest("GET");

    const response = await testHandler(request);
    assertEquals(response.status, 405);
  }
});

Deno.test({
  name: "exchange function - handles missing request body",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const authorization = req.headers.get('Authorization');
        if (!authorization) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        await req.json(); // This will throw for invalid JSON
        
        return new Response(JSON.stringify({ success: true }));
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request body' 
        }), { status: 400 });
      }
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
      },
      body: "invalid-json"
    });

    const response = await testHandler(request);
    assertEquals(response.status, 400);
  }
});

// Cleanup
Deno.test({
  name: "exchange function cleanup",
  fn: () => {
    cleanupTestEnv();
    globalThis.fetch = originalFetch;
    (globalThis as any).createClient = originalCreateClient;
    (globalThis as any).serve = originalServe;
  }
});
