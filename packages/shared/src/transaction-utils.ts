export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category?: string[];
  category_id?: string;
  iso_currency_code: string;
  account_owner?: string;
}

export interface NormalizedTransaction {
  org_id: string;
  account_id: string;
  date: string;
  amount_cents: string;
  currency: string;
  description: string;
  merchant_name: string | null;
  mcc: string | null;
  source: 'plaid';
  raw: PlaidTransaction;
  provider_tx_id: string;
  reviewed: boolean;
}

export function toCentsString(amount: number): string {
  return Math.round(Math.abs(amount) * 100).toString();
}

export function transformPlaidTransaction(
  transaction: PlaidTransaction,
  orgId: string,
  accountId: string
): NormalizedTransaction {
  return {
    org_id: orgId,
    account_id: accountId,
    date: transaction.date,
    amount_cents: toCentsString(transaction.amount),
    currency: transaction.iso_currency_code || 'USD',
    description: transaction.name,
    merchant_name: transaction.merchant_name || null,
    mcc: transaction.category_id || null,
    source: 'plaid',
    raw: transaction,
    provider_tx_id: transaction.transaction_id,
    reviewed: false,
  };
}