/// <reference path="../deno-types.d.ts" />

/**
 * Testing utilities for Edge Functions
 * Provides mocking and test setup helpers
 */

// Import assertions (marked as external for linter)
// @ts-ignore - External Deno standard library
import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";

export { assertEquals, assertRejects };

// Mock environment setup
export function setupTestEnv() {
  Deno.env.set("PLAID_CLIENT_ID", "test-client-id");
  Deno.env.set("PLAID_SECRET", "test-secret");
  Deno.env.set("PLAID_ENV", "sandbox");
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  Deno.env.set("ENCRYPTION_KEY", "test-encryption-key-32-chars-long");
}

// Mock JWT token for testing
export const MOCK_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJpYXQiOjE2NzAwMDAwMDB9.test";

// Mock user context
export const MOCK_USER_CONTEXT = {
  userId: "test-user-id",
  orgId: "test-org-id"
};

// Create mock request helper
export function createMockRequest(
  method: string = "POST",
  body?: any,
  headers: Record<string, string> = {}
): Request {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${MOCK_JWT}`,
    ...headers
  };

  return new Request("http://localhost/", {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Mock Plaid API responses
export const MOCK_PLAID_RESPONSES = {
  tokenExchange: {
    access_token: "access-test-token",
    item_id: "test-item-id"
  },
  accounts: {
    accounts: [{
      account_id: "test-account-id",
      balances: {
        available: 1000.50,
        current: 1200.75,
        iso_currency_code: "USD"
      },
      name: "Test Checking Account",
      type: "depository",
      subtype: "checking"
    }]
  },
  transactions: {
    transactions: [{
      transaction_id: "test-tx-id",
      account_id: "test-account-id",
      amount: 25.99,
      iso_currency_code: "USD",
      name: "Test Transaction",
      date: "2023-01-01"
    }],
    total_transactions: 1
  }
};

// Mock Supabase responses
export const MOCK_SUPABASE_RESPONSES = {
  connection: {
    id: "test-connection-id",
    org_id: "test-org-id",
    provider: "plaid",
    status: "active"
  },
  account: {
    id: "test-account-id",
    connection_id: "test-connection-id",
    name: "Test Account"
  }
};

// Mock fetch function for external API calls
export function createMockFetch(responses: Record<string, any> = {}) {
  const originalFetch = globalThis.fetch;
  
  return (url: string | URL | Request, init?: RequestInit) => {
    const urlString = url.toString();
    
    // Mock Plaid API calls
    if (urlString.includes('plaid.com/item/public_token/exchange')) {
      return Promise.resolve(new Response(
        JSON.stringify(responses.tokenExchange || MOCK_PLAID_RESPONSES.tokenExchange),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }
    
    if (urlString.includes('plaid.com/accounts/get')) {
      return Promise.resolve(new Response(
        JSON.stringify(responses.accounts || MOCK_PLAID_RESPONSES.accounts),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }
    
    if (urlString.includes('plaid.com/transactions/get')) {
      return Promise.resolve(new Response(
        JSON.stringify(responses.transactions || MOCK_PLAID_RESPONSES.transactions),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }
    
    // Mock Supabase function calls
    if (urlString.includes('functions/v1/')) {
      return Promise.resolve(new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }
    
    // Default to original fetch for unmocked URLs
    return originalFetch(url, init);
  };
}

// Mock Supabase client
export function createMockSupabaseClient() {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: MOCK_SUPABASE_RESPONSES.connection,
            error: null
          }),
          maybeSingle: () => Promise.resolve({
            data: MOCK_SUPABASE_RESPONSES.connection,
            error: null
          })
        }),
        limit: () => Promise.resolve({
          data: [MOCK_SUPABASE_RESPONSES.connection],
          error: null
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: MOCK_SUPABASE_RESPONSES.connection,
            error: null
          })
        })
      }),
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: MOCK_SUPABASE_RESPONSES.connection,
            error: null
          })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({
          data: [MOCK_SUPABASE_RESPONSES.connection],
          error: null
        })
      })
    }),
    auth: {
      getUser: () => Promise.resolve({
        data: {
          user: {
            id: "test-user-id",
            email: "test@example.com"
          }
        },
        error: null
      })
    }
  };
}

// Test teardown helper
export function cleanupTestEnv() {
  // Reset any global state if needed
  globalThis.fetch = globalThis.fetch; // Reset to original
}
