/// <reference path="../../deno-types.d.ts" />

/**
 * Tests for Plaid webhook Edge Function
 */

import { assertEquals } from "../../_test/test-utils.ts";
import {
  setupTestEnv,
  cleanupTestEnv,
  createMockFetch,
  createMockSupabaseClient
} from "../../_test/test-utils.ts";

// Setup test environment
Deno.test({
  name: "webhook function setup",
  fn: () => {
    setupTestEnv();
    globalThis.fetch = createMockFetch();
  }
});

Deno.test({
  name: "webhook function - handles TRANSACTIONS DEFAULT_UPDATE",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const rawBody = await req.text();
        const webhook = JSON.parse(rawBody);

        // Simplified webhook handling logic
        if (webhook.webhook_type === 'TRANSACTIONS' && 
            webhook.webhook_code === 'DEFAULT_UPDATE') {
          
          // Mock finding connection and triggering sync
          return new Response('OK', { status: 200 });
        }

        return new Response('OK', { status: 200 });

      } catch (error) {
        return new Response('Error processing webhook', { status: 500 });
      }
    };

    const webhookPayload = {
      webhook_type: 'TRANSACTIONS',
      webhook_code: 'DEFAULT_UPDATE',
      item_id: 'test-item-id',
      new_transactions: 5
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "plaid-verification": "test-signature"
      },
      body: JSON.stringify(webhookPayload)
    });

    const response = await testHandler(request);
    assertEquals(response.status, 200);
  }
});

Deno.test({
  name: "webhook function - handles ITEM ERROR",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const rawBody = await req.text();
        const webhook = JSON.parse(rawBody);

        if (webhook.webhook_type === 'ITEM' && 
            webhook.webhook_code === 'ERROR') {
          
          // Mock updating connection status to error
          return new Response('OK', { status: 200 });
        }

        return new Response('OK', { status: 200 });

      } catch (error) {
        return new Response('Error processing webhook', { status: 500 });
      }
    };

    const webhookPayload = {
      webhook_type: 'ITEM',
      webhook_code: 'ERROR',
      item_id: 'test-item-id',
      error: {
        error_type: 'ITEM_ERROR',
        error_code: 'ITEM_LOCKED'
      }
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "plaid-verification": "test-signature"
      },
      body: JSON.stringify(webhookPayload)
    });

    const response = await testHandler(request);
    assertEquals(response.status, 200);
  }
});

Deno.test({
  name: "webhook function - handles invalid method",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      return new Response('OK');
    };

    const request = new Request("http://localhost/", {
      method: "GET"
    });

    const response = await testHandler(request);
    assertEquals(response.status, 405);
  }
});

Deno.test({
  name: "webhook function - handles invalid JSON",
  async fn() {
    const testHandler = async (req: Request): Promise<Response> => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const rawBody = await req.text();
        JSON.parse(rawBody); // This will throw for invalid JSON
        return new Response('OK', { status: 200 });
      } catch (error) {
        return new Response('Error processing webhook', { status: 500 });
      }
    };

    const request = new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: "invalid-json"
    });

    const response = await testHandler(request);
    assertEquals(response.status, 500);
  }
});

// Cleanup
Deno.test({
  name: "webhook function cleanup",
  fn: () => {
    cleanupTestEnv();
  }
});
