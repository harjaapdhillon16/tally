import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  transformOrderToTransactions,
  transformRefundToTransactions,
  isOrderPaid,
  ECOMMERCE_CATEGORIES,
} from "./shopify-transform.ts";

Deno.test("transformOrderToTransactions - basic order with revenue, shipping, and discounts", () => {
  const order = {
    id: "gid://shopify/Order/12345",
    name: "#1001",
    processedAt: "2025-01-15T10:30:00Z",
    financialStatus: "paid",
    currency: "USD",
    currentSubtotalPriceSet: {
      shopMoney: {
        amount: "100.00",
        currencyCode: "USD",
      },
    },
    totalShippingPriceSet: {
      shopMoney: {
        amount: "10.00",
        currencyCode: "USD",
      },
    },
    totalDiscountsSet: {
      shopMoney: {
        amount: "5.00",
        currencyCode: "USD",
      },
    },
    totalTaxSet: {
      shopMoney: {
        amount: "8.00",
        currencyCode: "USD",
      },
    },
  };

  const orgId = "org-123";
  const transactions = transformOrderToTransactions(order, orgId);

  // Should create 3 transactions: revenue, shipping, discounts
  assertEquals(transactions.length, 3);

  // Revenue transaction
  const revenue = transactions.find(tx => tx.provider_tx_id === "order:12345:revenue");
  assertEquals(revenue?.amount_cents, 10000); // $100.00
  assertEquals(revenue?.category_id, ECOMMERCE_CATEGORIES.DTC_SALES);
  assertEquals(revenue?.description, "Shopify order #1001");
  assertEquals(revenue?.source, "shopify");
  assertEquals(revenue?.org_id, orgId);

  // Shipping transaction
  const shipping = transactions.find(tx => tx.provider_tx_id === "order:12345:shipping");
  assertEquals(shipping?.amount_cents, 1000); // $10.00
  assertEquals(shipping?.category_id, ECOMMERCE_CATEGORIES.SHIPPING_INCOME);
  assertEquals(shipping?.description, "Shipping income for #1001");

  // Discounts transaction (contra-revenue, negative)
  const discounts = transactions.find(tx => tx.provider_tx_id === "order:12345:discounts");
  assertEquals(discounts?.amount_cents, -500); // -$5.00
  assertEquals(discounts?.category_id, ECOMMERCE_CATEGORIES.DISCOUNTS_CONTRA);
  assertEquals(discounts?.description, "Discounts for #1001");
});

Deno.test("transformOrderToTransactions - order with no shipping or discounts", () => {
  const order = {
    id: "12345",
    name: "#1002",
    processed_at: "2025-01-15T10:30:00Z",
    financial_status: "paid",
    currency: "USD",
    current_subtotal_price: "50.00",
    total_shipping_price: "0.00",
    total_discounts: "0.00",
  };

  const transactions = transformOrderToTransactions(order, "org-123");

  // Should only create revenue transaction
  assertEquals(transactions.length, 1);
  assertEquals(transactions[0].provider_tx_id, "order:12345:revenue");
  assertEquals(transactions[0].amount_cents, 5000);
});

Deno.test("transformRefundToTransactions - basic refund", () => {
  const refund = {
    id: "gid://shopify/Refund/67890",
    order_id: "gid://shopify/Order/12345",
    createdAt: "2025-01-16T14:20:00Z",
    currency: "USD",
    totalRefundedSet: {
      shopMoney: {
        amount: "25.00",
        currencyCode: "USD",
      },
    },
  };

  const orgId = "org-123";
  const transactions = transformRefundToTransactions(refund, orgId);

  assertEquals(transactions.length, 1);
  
  const refundTx = transactions[0];
  assertEquals(refundTx.amount_cents, -2500); // Negative for contra-revenue
  assertEquals(refundTx.category_id, ECOMMERCE_CATEGORIES.REFUNDS_ALLOWANCES_CONTRA);
  assertEquals(refundTx.provider_tx_id, "refund:67890");
  assertEquals(refundTx.description, "Refund for order #12345");
  assertEquals(refundTx.source, "shopify");
  assertEquals(refundTx.date, "2025-01-16");
});

Deno.test("transformRefundToTransactions - REST API format", () => {
  const refund = {
    id: "67890",
    order_id: "12345",
    created_at: "2025-01-16T14:20:00Z",
    currency: "USD",
    total_refunded: "30.50",
  };

  const transactions = transformRefundToTransactions(refund, "org-123", "12345");

  assertEquals(transactions.length, 1);
  assertEquals(transactions[0].amount_cents, -3050);
  assertEquals(transactions[0].provider_tx_id, "refund:67890");
});

Deno.test("isOrderPaid - paid orders", () => {
  assertEquals(isOrderPaid({ financial_status: "paid" }), true);
  assertEquals(isOrderPaid({ financialStatus: "paid" }), true);
  assertEquals(isOrderPaid({ financial_status: "partially_paid" }), true);
});

Deno.test("isOrderPaid - unpaid orders", () => {
  assertEquals(isOrderPaid({ financial_status: "pending" }), false);
  assertEquals(isOrderPaid({ financialStatus: "refunded" }), false);
  assertEquals(isOrderPaid({ financial_status: "voided" }), false);
  assertEquals(isOrderPaid({}), false);
});

Deno.test("transformOrderToTransactions - handles zero amounts", () => {
  const order = {
    id: "12345",
    name: "#1003",
    processed_at: "2025-01-15T10:30:00Z",
    financial_status: "paid",
    currency: "USD",
    current_subtotal_price: "0.00",
    total_shipping_price: "0.00",
    total_discounts: "0.00",
  };

  const transactions = transformOrderToTransactions(order, "org-123");

  // Should create no transactions for zero amounts
  assertEquals(transactions.length, 0);
});

Deno.test("transformOrderToTransactions - date extraction", () => {
  const order = {
    id: "12345",
    processedAt: "2025-01-15T10:30:45.123Z",
    financialStatus: "paid",
    currentSubtotalPriceSet: {
      shopMoney: {
        amount: "10.00",
        currencyCode: "USD",
      },
    },
  };

  const transactions = transformOrderToTransactions(order, "org-123");

  assertEquals(transactions[0].date, "2025-01-15");
});

