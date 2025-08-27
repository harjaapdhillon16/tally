import { describe, it, expect } from 'vitest';
import { toCentsString, transformPlaidTransaction } from './transaction-utils.js';
import type { PlaidTransaction } from './transaction-utils.js';

describe('Transaction Service Utilities', () => {
  describe('toCentsString', () => {
    it('should convert dollars to cents string', () => {
      expect(toCentsString(10.50)).toBe('1050');
      expect(toCentsString(0.01)).toBe('1');
      expect(toCentsString(100.99)).toBe('10099');
    });

    it('should handle zero amounts', () => {
      expect(toCentsString(0)).toBe('0');
    });

    it('should handle negative amounts by taking absolute value', () => {
      expect(toCentsString(-10.50)).toBe('1050');
      expect(toCentsString(-0.01)).toBe('1');
    });

    it('should round to nearest cent', () => {
      expect(toCentsString(10.555)).toBe('1056');
      expect(toCentsString(10.554)).toBe('1055');
    });

    it('should handle very small amounts', () => {
      expect(toCentsString(0.001)).toBe('0');
      expect(toCentsString(0.005)).toBe('1');
    });
  });

  describe('transformPlaidTransaction', () => {
    it('should transform plaid transaction to normalized format', () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: 'tx123',
        account_id: 'acc456',
        amount: 25.50,
        date: '2024-01-15',
        name: 'Coffee Shop Purchase',
        merchant_name: 'Local Coffee',
        category: ['Food and Drink', 'Restaurants'],
        category_id: 'cat789',
        iso_currency_code: 'USD',
        account_owner: 'John Doe',
      };

      const result = transformPlaidTransaction(plaidTransaction, 'org123', 'internal456');

      expect(result).toEqual({
        org_id: 'org123',
        account_id: 'internal456',
        date: '2024-01-15',
        amount_cents: '2550',
        currency: 'USD',
        description: 'Coffee Shop Purchase',
        merchant_name: 'Local Coffee',
        mcc: 'cat789',
        source: 'plaid',
        raw: plaidTransaction,
        provider_tx_id: 'tx123',
        reviewed: false,
      });
    });

    it('should handle missing optional fields', () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: 'tx123',
        account_id: 'acc456',
        amount: 10.00,
        date: '2024-01-15',
        name: 'Transaction without details',
        iso_currency_code: 'USD',
      };

      const result = transformPlaidTransaction(plaidTransaction, 'org123', 'internal456');

      expect(result).toEqual({
        org_id: 'org123',
        account_id: 'internal456',
        date: '2024-01-15',
        amount_cents: '1000',
        currency: 'USD',
        description: 'Transaction without details',
        merchant_name: null,
        mcc: null,
        source: 'plaid',
        raw: plaidTransaction,
        provider_tx_id: 'tx123',
        reviewed: false,
      });
    });

    it('should default to USD when currency is missing', () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: 'tx123',
        account_id: 'acc456',
        amount: 15.75,
        date: '2024-01-15',
        name: 'No currency transaction',
        iso_currency_code: '',
      };

      const result = transformPlaidTransaction(plaidTransaction, 'org123', 'internal456');

      expect(result.currency).toBe('USD');
    });

    it('should handle zero amount transactions', () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: 'tx123',
        account_id: 'acc456',
        amount: 0,
        date: '2024-01-15',
        name: 'Zero amount transaction',
        iso_currency_code: 'USD',
      };

      const result = transformPlaidTransaction(plaidTransaction, 'org123', 'internal456');

      expect(result.amount_cents).toBe('0');
    });

    it('should handle negative amounts correctly', () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: 'tx123',
        account_id: 'acc456',
        amount: -50.25,
        date: '2024-01-15',
        name: 'Refund transaction',
        iso_currency_code: 'USD',
      };

      const result = transformPlaidTransaction(plaidTransaction, 'org123', 'internal456');

      expect(result.amount_cents).toBe('5025');
    });

    it('should preserve raw transaction data', () => {
      const plaidTransaction: PlaidTransaction = {
        transaction_id: 'tx123',
        account_id: 'acc456',
        amount: 20.00,
        date: '2024-01-15',
        name: 'Test transaction',
        iso_currency_code: 'USD',
        category: ['Custom', 'Category'],
        account_owner: 'Test Owner',
      };

      const result = transformPlaidTransaction(plaidTransaction, 'org123', 'internal456');

      expect(result.raw).toEqual(plaidTransaction);
      expect(result.raw.category).toEqual(['Custom', 'Category']);
      expect(result.raw.account_owner).toBe('Test Owner');
    });
  });
});