import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { NormalizedTransaction, CategorizationContext } from '@nexus/types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the analytics import
vi.mock('@nexus/analytics/server', () => ({
  createGeneration: vi.fn(() => ({
    end: vi.fn()
  }))
}));

// Import after mocking
const { scoreWithLLM } = await import('./pass2_llm.js');

describe('scoreWithLLM', () => {
  const mockDb = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { name: 'Hair Services' }, error: null })
        })
      })
    })
  };

  const mockContext: CategorizationContext & { 
    db: any;
    analytics?: any;
    logger?: any;
    config?: { openaiApiKey?: string; model?: string };
  } = {
    orgId: 'test-org-id' as any,
    db: mockDb,
    analytics: {
      captureEvent: vi.fn(),
      captureException: vi.fn()
    },
    logger: {
      error: vi.fn()
    },
    config: {
      openaiApiKey: 'test-key',
      model: 'gpt-4o-mini'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  test('successfully categorizes with valid LLM response', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            category_slug: 'supplies',
            confidence: 0.85,
            rationale: 'Hair product purchase for salon inventory'
          })
        }
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '15000',
      currency: 'USD',
      description: 'Professional hair care products for salon',
      merchantName: 'Beauty Supply Store',
      mcc: '5912',
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    const result = await scoreWithLLM(tx, mockContext);
    
    expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440012'); // Supplies
    expect(result.confidence).toBe(0.85);
    expect(result.rationale).toContain('LLM: Hair product purchase for salon inventory');
  });

  test('handles malformed LLM response gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'invalid json response' } }]
      })
    });

    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '5000',
      currency: 'USD',
      description: 'Unknown transaction',
      merchantName: 'Unknown Merchant',
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    const result = await scoreWithLLM(tx, mockContext);
    
    expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440024'); // Other expenses (fallback)
    expect(result.confidence).toBe(0.5);
    expect(result.rationale).toContain('LLM: Failed to parse LLM response');
  });

  test('handles API errors with fallback', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    });

    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '2500',
      currency: 'USD',
      description: 'Monthly software subscription',
      merchantName: 'Adobe Creative Cloud',
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    const result = await scoreWithLLM(tx, mockContext);
    
    expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440024'); // Other expenses (fallback)
    expect(result.confidence).toBe(0.5);
    expect(result.rationale).toContain('LLM categorization failed, using fallback');
    expect(mockContext.analytics?.captureException).toHaveBeenCalled();
  });

  test('clamps confidence values to valid range', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            category_slug: 'software',
            confidence: 1.5, // Invalid confidence > 1
            rationale: 'Software subscription'
          })
        }
      }],
      usage: { total_tokens: 100 }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '2999',
      currency: 'USD',
      description: 'Salon management software',
      merchantName: 'TechVendor',
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    const result = await scoreWithLLM(tx, mockContext);
    
    expect(result.confidence).toBe(1.0); // Clamped to max 1.0
    expect(result.categoryId).toBe('550e8400-e29b-41d4-a716-446655440020'); // Software
  });

  test('trims description to 160 characters', async () => {
    const longDescription = 'A'.repeat(200); // 200 character description
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"category_slug":"other_expenses","confidence":0.6,"rationale":"Long description"}' } }],
        usage: { total_tokens: 100 }
      })
    });

    const tx: NormalizedTransaction = {
      id: 'tx-1' as any,
      orgId: 'test-org-id' as any,
      date: '2024-01-01',
      amountCents: '1000',
      currency: 'USD',
      description: longDescription,
      merchantName: 'Test Merchant',
      source: 'plaid',
      reviewed: false,
      needsReview: false,
      raw: {}
    };

    await scoreWithLLM(tx, mockContext);
    
    // Verify that fetch was called with a prompt containing trimmed description
    const fetchCall = (global.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    const prompt = requestBody.messages[1].content;
    
    expect(prompt).toContain('A'.repeat(157) + '...');
    expect(prompt).not.toContain('A'.repeat(160));
  });
});