import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { NormalizedTransaction, CategorizationContext } from '@nexus/types';

// Mock the GeminiClient
vi.mock('./gemini-client.js', () => ({
  GeminiClient: vi.fn().mockImplementation(() => ({
    generateContent: vi.fn(),
    getModelName: vi.fn(() => 'gemini-2.5-flash-lite')
  }))
}));

// Mock the analytics import
vi.mock('@nexus/analytics/server', () => ({
  createGeneration: vi.fn(() => ({
    end: vi.fn()
  }))
}));

// Import after mocking
const { scoreWithLLM } = await import('./pass2_llm.js');
const { GeminiClient } = await import('./gemini-client.js');

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
    config?: { geminiApiKey?: string; model?: string };
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
      geminiApiKey: 'test-key',
      model: 'gemini-2.5-flash-lite'
    }
  };

  let mockGeminiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementation
    mockGeminiClient = {
      generateContent: vi.fn(),
      getModelName: vi.fn(() => 'gemini-2.5-flash-lite')
    };
    (GeminiClient as any).mockImplementation(() => mockGeminiClient);
  });

  test('successfully categorizes with valid LLM response', async () => {
    const mockResponse = {
      text: JSON.stringify({
        category_slug: 'supplies',
        confidence: 0.85,
        rationale: 'Hair product purchase for salon inventory'
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    };

    mockGeminiClient.generateContent.mockResolvedValueOnce(mockResponse);

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
    const mockResponse = {
      text: 'invalid json response',
      usage: {
        promptTokens: 50,
        completionTokens: 10,
        totalTokens: 60
      }
    };

    mockGeminiClient.generateContent.mockResolvedValueOnce(mockResponse);

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
    mockGeminiClient.generateContent.mockRejectedValueOnce(
      new Error('Gemini API error: 429 Too Many Requests')
    );

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
      text: JSON.stringify({
        category_slug: 'software',
        confidence: 1.5, // Invalid confidence > 1
        rationale: 'Software subscription'
      }),
      usage: { 
        promptTokens: 80,
        completionTokens: 20,
        totalTokens: 100 
      }
    };

    mockGeminiClient.generateContent.mockResolvedValueOnce(mockResponse);

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
    
    const mockResponse = {
      text: JSON.stringify({
        category_slug: 'other_expenses',
        confidence: 0.6,
        rationale: 'Long description'
      }),
      usage: { 
        promptTokens: 120,
        completionTokens: 30,
        totalTokens: 150 
      }
    };

    mockGeminiClient.generateContent.mockResolvedValueOnce(mockResponse);

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
    
    // Verify that generateContent was called with a prompt containing trimmed description
    const generateContentCall = mockGeminiClient.generateContent.mock.calls[0];
    const prompt = generateContentCall[0];
    
    expect(prompt).toContain('A'.repeat(157) + '...');
    expect(prompt).not.toContain('A'.repeat(160));
  });
});