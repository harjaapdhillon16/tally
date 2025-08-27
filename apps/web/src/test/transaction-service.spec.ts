import { describe, it, expect } from "vitest";

// Test the core transaction transformation logic

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category?: string[];
  category_id?: string;
  iso_currency_code: string;
}

interface NormalizedTransaction {
  org_id: string;
  account_id: string;
  date: string;
  amount_cents: string;
  currency: string;
  description: string;
  merchant_name: string | null;
  mcc: string | null;
  source: "plaid";
  raw: PlaidTransaction;
  provider_tx_id: string;
  reviewed: boolean;
}

function toCentsString(amount: number): string {
  return Math.round(Math.abs(amount) * 100).toString();
}

function transformPlaidTransaction(
  transaction: PlaidTransaction,
  orgId: string,
  accountId: string
): NormalizedTransaction {
  return {
    org_id: orgId,
    account_id: accountId,
    date: transaction.date,
    amount_cents: toCentsString(transaction.amount),
    currency: transaction.iso_currency_code || "USD",
    description: transaction.name,
    merchant_name: transaction.merchant_name || null,
    mcc: transaction.category_id || null,
    source: "plaid",
    raw: transaction,
    provider_tx_id: transaction.transaction_id,
    reviewed: false,
  };
}

describe("Transaction Service", () => {
  describe("toCentsString", () => {
    it("should convert dollar amounts to cents", () => {
      expect(toCentsString(1.23)).toBe("123");
      expect(toCentsString(100.5)).toBe("10050");
      expect(toCentsString(0.01)).toBe("1");
    });

    it("should handle zero amount", () => {
      expect(toCentsString(0)).toBe("0");
    });

    it("should handle negative amounts by taking absolute value", () => {
      expect(toCentsString(-25.75)).toBe("2575");
      expect(toCentsString(-0.5)).toBe("50");
    });

    it("should round to nearest cent", () => {
      expect(toCentsString(1.234)).toBe("123");
      expect(toCentsString(1.235)).toBe("124");
      expect(toCentsString(1.236)).toBe("124");
    });

    it("should handle large amounts", () => {
      expect(toCentsString(999999.99)).toBe("99999999");
    });
  });

  describe("transformPlaidTransaction", () => {
    it("should transform basic Plaid transaction", () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: "tx_123",
        account_id: "acc_456",
        amount: 25.5,
        date: "2023-12-01",
        name: "Coffee Shop",
        merchant_name: "Local Coffee",
        category: ["Food and Drink", "Restaurants", "Coffee Shop"],
        category_id: "13005043",
        iso_currency_code: "USD",
      };

      const result = transformPlaidTransaction(plaidTransaction, "org_789", "account_internal_id");

      expect(result).toEqual({
        org_id: "org_789",
        account_id: "account_internal_id",
        date: "2023-12-01",
        amount_cents: "2550",
        currency: "USD",
        description: "Coffee Shop",
        merchant_name: "Local Coffee",
        mcc: "13005043",
        source: "plaid",
        raw: plaidTransaction,
        provider_tx_id: "tx_123",
        reviewed: false,
      });
    });

    it("should handle missing optional fields", () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: "tx_456",
        account_id: "acc_789",
        amount: 100.0,
        date: "2023-12-02",
        name: "Online Transfer",
        iso_currency_code: "USD",
      };

      const result = transformPlaidTransaction(plaidTransaction, "org_123", "account_internal_id");

      expect(result.merchant_name).toBeNull();
      expect(result.mcc).toBeNull();
      expect(result.currency).toBe("USD");
    });

    it("should default to USD when currency is missing", () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: "tx_789",
        account_id: "acc_123",
        amount: 50.0,
        date: "2023-12-03",
        name: "Test Transaction",
        iso_currency_code: "",
      };

      const result = transformPlaidTransaction(plaidTransaction, "org_456", "account_internal_id");

      expect(result.currency).toBe("USD");
    });

    it("should preserve raw transaction data", () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: "tx_complex",
        account_id: "acc_complex",
        amount: 75.25,
        date: "2023-12-04",
        name: "Complex Transaction",
        merchant_name: "Test Merchant",
        category: ["Shopping", "General"],
        category_id: "19047000",
        iso_currency_code: "USD",
      };

      const result = transformPlaidTransaction(plaidTransaction, "org_789", "account_internal_id");

      expect(result.raw).toEqual(plaidTransaction);
      expect(result.raw.category).toEqual(["Shopping", "General"]);
    });

    it("should handle different currencies", () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: "tx_eur",
        account_id: "acc_eur",
        amount: 42.75,
        date: "2023-12-05",
        name: "European Transaction",
        iso_currency_code: "EUR",
      };

      const result = transformPlaidTransaction(plaidTransaction, "org_eur", "account_eur_id");

      expect(result.currency).toBe("EUR");
      expect(result.amount_cents).toBe("4275");
    });
  });
});
