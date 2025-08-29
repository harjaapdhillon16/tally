import { describe, expect, test } from 'vitest';
import type { NormalizedTransaction, CategorizationContext } from '@nexus/types';
import { pass1Categorize, normalizeVendor } from './pass1.js';

describe('normalizeVendor', () => {
  test('removes common business suffixes', () => {
    expect(normalizeVendor('Friendly Cuts LLC')).toBe('friendly cuts');
    expect(normalizeVendor('Beauty Supply Inc.')).toBe('beauty supply');
    expect(normalizeVendor('Salon Equipment Corp')).toBe('salon equipment');
  });

  test('handles punctuation and spacing', () => {
    expect(normalizeVendor('  Beauty & Nails Co.  ')).toBe('beauty nails');
    expect(normalizeVendor('Hair-Care Ltd')).toBe('hair care');
  });

  test('preserves meaningful parts', () => {
    expect(normalizeVendor('Sally Beauty')).toBe('sally beauty');
    expect(normalizeVendor('Professional Hair Products')).toBe('professional hair products');
  });
});

describe('pass1Categorize', () => {
  const mockDb = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          not: () => Promise.resolve({ data: [], error: null })
        })
      })
    })
  };

  const mockContext: CategorizationContext & { db: any } = {
    orgId: 'test-org-id' as any,
    db: mockDb
  };

  test('categorizes by MCC mapping', async () => {
    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '10000',
      currency: 'USD',
      description: 'Hair cut service',
      merchantName: 'Local Salon',
      mcc: '7230', // Hair services
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    const result = await pass1Categorize(tx, mockContext);
    
    expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440002');
    expect(result.confidence).toBe(0.9);
    expect(result.rationale).toContain('mcc: 7230 → Hair Services');
  });

  test('categorizes by description patterns', async () => {
    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '5000',
      currency: 'USD',
      description: 'Monthly rent payment',
      merchantName: 'Property Management LLC',
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    const result = await pass1Categorize(tx, mockContext);
    
    expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440011');
    expect(result.confidence).toBe(0.75);
    expect(result.rationale).toContain("pattern: 'rent|lease|property|utilities|electric|gas|water' matched → Rent & Utilities");
  });

  test('returns empty result when no matches', async () => {
    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '1000',
      currency: 'USD',
      description: 'Unknown transaction',
      merchantName: 'Mystery Merchant',
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    const result = await pass1Categorize(tx, mockContext);
    
    expect(result.categoryId).toBeUndefined();
    expect(result.confidence).toBeUndefined();
    expect(result.rationale).toEqual([]);
  });

  test('handles errors gracefully', async () => {
    // Create a context that throws during execution
    const errorContext = {
      ...mockContext,
      db: {
        from: () => {
          throw new Error('DB connection failed');
        }
      }
    };

    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '1000',
      currency: 'USD',
      description: 'Test transaction',
      merchantName: 'Test Merchant',
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    const result = await pass1Categorize(tx, errorContext);
    
    expect(result.categoryId).toBeUndefined();
    expect(result.confidence).toBeUndefined();
    expect(result.rationale).toContain('Error during pass1 categorization');
  });
});