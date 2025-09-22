import { describe, test, expect, vi } from 'vitest';
import {
  getIndustryForOrg,
  getCategorizationConfig,
  type Industry,
  type CategorizationConfig
} from './config.js';

const createMockDatabase = (industryResponse: string | null = 'ecommerce') => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: industryResponse ? { industry: industryResponse } : null,
          error: null
        })
      })
    })
  })
});

describe('config', () => {
  describe('getIndustryForOrg', () => {
    test('returns ecommerce for ecommerce org', async () => {
      const db = createMockDatabase('ecommerce');
      const result = await getIndustryForOrg(db, 'org-123');

      expect(result).toBe('ecommerce');
      expect(db.from).toHaveBeenCalledWith('orgs');
    });

    test('defaults to ecommerce for unknown industry', async () => {
      const db = createMockDatabase('salon');
      const result = await getIndustryForOrg(db, 'org-123');

      expect(result).toBe('ecommerce');
    });

    test('defaults to ecommerce when org not found', async () => {
      const db = createMockDatabase(null);
      const result = await getIndustryForOrg(db, 'org-123');

      expect(result).toBe('ecommerce');
    });

    test('handles database errors gracefully', async () => {
      const db = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      };

      const result = await getIndustryForOrg(db, 'org-123');
      expect(result).toBe('ecommerce');
    });
  });

  describe('getCategorizationConfig', () => {
    test('returns ecommerce config for ecommerce industry', async () => {
      const db = createMockDatabase('ecommerce');
      const config = await getCategorizationConfig(db, 'org-123');

      expect(config.industry).toBe('ecommerce');
      expect(config.autoApplyThreshold).toBe(0.95);
      expect(config.hybridThreshold).toBe(0.95);
      expect(config.useGuardrails).toBe(true);
    });

    test('returns consistent config structure', async () => {
      const db = createMockDatabase('salon');
      const config = await getCategorizationConfig(db, 'org-123');

      // Should still use ecommerce config as default
      expect(config).toMatchObject({
        industry: 'ecommerce',
        autoApplyThreshold: expect.any(Number),
        hybridThreshold: expect.any(Number),
        useGuardrails: expect.any(Boolean)
      });
    });

    test('config values are within expected ranges', async () => {
      const db = createMockDatabase('ecommerce');
      const config = await getCategorizationConfig(db, 'org-123');

      expect(config.autoApplyThreshold).toBeGreaterThan(0);
      expect(config.autoApplyThreshold).toBeLessThanOrEqual(1);
      expect(config.hybridThreshold).toBeGreaterThan(0);
      expect(config.hybridThreshold).toBeLessThanOrEqual(1);
    });
  });
});