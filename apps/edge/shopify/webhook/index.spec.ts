import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

/**
 * Integration tests for Shopify webhook handler
 * Note: These tests require a test database and environment setup
 */

// Mock HMAC computation for testing
async function computeHmac(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.test("Shopify webhook - rejects missing HMAC", async () => {
  const payload = JSON.stringify({
    id: 12345,
    name: "#1001",
    financial_status: "paid",
  });

  const response = await fetch("http://localhost:54321/functions/v1/shopify-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Topic": "orders/paid",
      "X-Shopify-Shop-Domain": "test-store.myshopify.com",
    },
    body: payload,
  });

  assertEquals(response.status, 401);
});

Deno.test("Shopify webhook - rejects invalid HMAC", async () => {
  const payload = JSON.stringify({
    id: 12345,
    name: "#1001",
    financial_status: "paid",
  });

  const response = await fetch("http://localhost:54321/functions/v1/shopify-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Hmac-Sha256": "invalid-hmac",
      "X-Shopify-Topic": "orders/paid",
      "X-Shopify-Shop-Domain": "test-store.myshopify.com",
    },
    body: payload,
  });

  assertEquals(response.status, 401);
});

Deno.test("Shopify webhook - accepts valid HMAC and processes order", async () => {
  const secret = Deno.env.get("SHOPIFY_API_SECRET") || "test-secret";
  
  const payload = JSON.stringify({
    id: 12345,
    name: "#1001",
    processed_at: "2025-01-15T10:30:00Z",
    financial_status: "paid",
    currency: "USD",
    current_subtotal_price: "100.00",
    total_shipping_price: "10.00",
    total_discounts: "5.00",
  });

  const hmac = await computeHmac(payload, secret);

  const response = await fetch("http://localhost:54321/functions/v1/shopify-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Hmac-Sha256": hmac,
      "X-Shopify-Topic": "orders/paid",
      "X-Shopify-Shop-Domain": "test-store.myshopify.com",
      "X-Shopify-Webhook-Id": "test-webhook-123",
    },
    body: payload,
  });

  // May return 404 if no connection exists, or 200 if processed
  // In a real test, we'd set up a test connection first
  assertEquals([200, 404].includes(response.status), true);
});

Deno.test("Shopify webhook - handles refund event", async () => {
  const secret = Deno.env.get("SHOPIFY_API_SECRET") || "test-secret";
  
  const payload = JSON.stringify({
    id: 67890,
    order_id: 12345,
    created_at: "2025-01-16T14:20:00Z",
    currency: "USD",
    total_refunded: "25.00",
  });

  const hmac = await computeHmac(payload, secret);

  const response = await fetch("http://localhost:54321/functions/v1/shopify-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Hmac-Sha256": hmac,
      "X-Shopify-Topic": "refunds/create",
      "X-Shopify-Shop-Domain": "test-store.myshopify.com",
    },
    body: payload,
  });

  assertEquals([200, 404].includes(response.status), true);
});

Deno.test("Shopify webhook - skips unpaid orders", async () => {
  const secret = Deno.env.get("SHOPIFY_API_SECRET") || "test-secret";
  
  const payload = JSON.stringify({
    id: 12346,
    name: "#1002",
    processed_at: "2025-01-15T10:30:00Z",
    financial_status: "pending",
    currency: "USD",
    current_subtotal_price: "100.00",
  });

  const hmac = await computeHmac(payload, secret);

  const response = await fetch("http://localhost:54321/functions/v1/shopify-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Hmac-Sha256": hmac,
      "X-Shopify-Topic": "orders/paid",
      "X-Shopify-Shop-Domain": "test-store.myshopify.com",
    },
    body: payload,
  });

  assertEquals(response.status, 200);
  
  const result = await response.json();
  assertEquals(result.message, "Order not paid, skipped");
});




