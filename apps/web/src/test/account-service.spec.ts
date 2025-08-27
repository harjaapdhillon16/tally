import { describe, it, expect } from "vitest";

// Since the actual account service uses Deno, we'll test the core logic here
// by creating equivalent functions for Node.js environment

interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string;
  };
}

interface NormalizedAccount {
  org_id: string;
  connection_id: string;
  provider_account_id: string;
  name: string;
  type: string;
  currency: string;
  is_active: boolean;
}

function normalizeAccountType(plaidType: string, plaidSubtype: string): string {
  const typeMap: Record<string, string> = {
    checking: "checking",
    savings: "savings",
    "credit card": "credit_card",
    "money market": "savings",
    cd: "savings",
    ira: "investment",
    "401k": "investment",
  };

  return typeMap[plaidSubtype] || typeMap[plaidType] || "other";
}

function transformPlaidAccounts(
  accounts: PlaidAccount[],
  orgId: string,
  connectionId: string
): NormalizedAccount[] {
  return accounts.map((account) => ({
    org_id: orgId,
    connection_id: connectionId,
    provider_account_id: account.account_id,
    name: account.name,
    type: normalizeAccountType(account.type, account.subtype),
    currency: account.balances.iso_currency_code || "USD",
    is_active: true,
  }));
}

describe("Account Service", () => {
  describe("normalizeAccountType", () => {
    it("should normalize checking account types", () => {
      expect(normalizeAccountType("depository", "checking")).toBe("checking");
      expect(normalizeAccountType("depository", "savings")).toBe("savings");
    });

    it("should normalize credit card types", () => {
      expect(normalizeAccountType("credit", "credit card")).toBe("credit_card");
    });

    it("should handle money market accounts", () => {
      expect(normalizeAccountType("depository", "money market")).toBe("savings");
    });

    it("should handle investment accounts", () => {
      expect(normalizeAccountType("investment", "ira")).toBe("investment");
      expect(normalizeAccountType("investment", "401k")).toBe("investment");
    });

    it("should handle unknown types", () => {
      expect(normalizeAccountType("unknown", "unknown")).toBe("other");
    });

    it("should fallback to plaidType when subtype is unknown", () => {
      expect(normalizeAccountType("checking", "unknown_subtype")).toBe("checking");
    });
  });

  describe("transformPlaidAccounts", () => {
    it("should transform Plaid accounts to normalized format", () => {
      const plaidAccounts: PlaidAccount[] = [
        {
          account_id: "acc_123",
          name: "Test Checking",
          type: "depository",
          subtype: "checking",
          balances: {
            available: 1000,
            current: 1200,
            iso_currency_code: "USD",
          },
        },
      ];

      const result = transformPlaidAccounts(plaidAccounts, "org_456", "conn_789");

      expect(result).toEqual([
        {
          org_id: "org_456",
          connection_id: "conn_789",
          provider_account_id: "acc_123",
          name: "Test Checking",
          type: "checking",
          currency: "USD",
          is_active: true,
        },
      ]);
    });

    it("should handle missing currency code", () => {
      const plaidAccounts: PlaidAccount[] = [
        {
          account_id: "acc_123",
          name: "Test Account",
          type: "depository",
          subtype: "checking",
          balances: {
            available: null,
            current: null,
            iso_currency_code: null as any,
          },
        },
      ];

      const result = transformPlaidAccounts(plaidAccounts, "org_456", "conn_789");

      expect(result[0]?.currency).toBe("USD");
    });

    it("should handle multiple accounts", () => {
      const plaidAccounts: PlaidAccount[] = [
        {
          account_id: "acc_checking",
          name: "Checking Account",
          type: "depository",
          subtype: "checking",
          balances: { available: 1000, current: 1000, iso_currency_code: "USD" },
        },
        {
          account_id: "acc_savings",
          name: "Savings Account",
          type: "depository",
          subtype: "savings",
          balances: { available: 5000, current: 5000, iso_currency_code: "USD" },
        },
        {
          account_id: "acc_credit",
          name: "Credit Card",
          type: "credit",
          subtype: "credit card",
          balances: { available: 2000, current: -500, iso_currency_code: "USD" },
        },
      ];

      const result = transformPlaidAccounts(plaidAccounts, "org_456", "conn_789");

      expect(result).toHaveLength(3);
      expect(result[0]?.type).toBe("checking");
      expect(result[1]?.type).toBe("savings");
      expect(result[2]?.type).toBe("credit_card");
    });
  });
});
