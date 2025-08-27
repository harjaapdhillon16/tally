import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validatePlaidConfig, validateDatabaseConfig, getAppConfig } from './config.js';

describe('Configuration Utilities', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear environment variables
    delete process.env.PLAID_CLIENT_ID;
    delete process.env.PLAID_SECRET;
    delete process.env.PLAID_ENV;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('validatePlaidConfig', () => {
    it('should validate complete Plaid configuration', () => {
      process.env.PLAID_CLIENT_ID = 'test-client-id';
      process.env.PLAID_SECRET = 'test-secret';
      process.env.PLAID_ENV = 'sandbox';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

      const config = validatePlaidConfig();

      expect(config).toEqual({
        clientId: 'test-client-id',
        secret: 'test-secret',
        environment: 'sandbox',
        webhookUrl: 'https://example.com/api/plaid/webhook',
      });
    });

    it('should use default values for optional fields', () => {
      process.env.PLAID_CLIENT_ID = 'test-client-id';
      process.env.PLAID_SECRET = 'test-secret';

      const config = validatePlaidConfig();

      expect(config.environment).toBe('sandbox');
      expect(config.webhookUrl).toBe('http://localhost:3000/api/plaid/webhook');
    });

    it('should throw error when PLAID_CLIENT_ID is missing', () => {
      process.env.PLAID_SECRET = 'test-secret';

      expect(() => validatePlaidConfig()).toThrow(
        'PLAID_CLIENT_ID environment variable is required'
      );
    });

    it('should throw error when PLAID_SECRET is missing', () => {
      process.env.PLAID_CLIENT_ID = 'test-client-id';

      expect(() => validatePlaidConfig()).toThrow(
        'PLAID_SECRET environment variable is required'
      );
    });

    it('should throw error for invalid environment', () => {
      process.env.PLAID_CLIENT_ID = 'test-client-id';
      process.env.PLAID_SECRET = 'test-secret';
      process.env.PLAID_ENV = 'invalid-env';

      expect(() => validatePlaidConfig()).toThrow(
        'Invalid PLAID_ENV: invalid-env. Must be sandbox, development, or production'
      );
    });

    it('should accept valid environments', () => {
      process.env.PLAID_CLIENT_ID = 'test-client-id';
      process.env.PLAID_SECRET = 'test-secret';

      const validEnvs = ['sandbox', 'development', 'production'];

      validEnvs.forEach(env => {
        process.env.PLAID_ENV = env;
        const config = validatePlaidConfig();
        expect(config.environment).toBe(env);
      });
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should validate complete database configuration', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      const config = validateDatabaseConfig();

      expect(config).toEqual({
        url: 'https://test.supabase.co',
        serviceRoleKey: 'test-service-role-key',
      });
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

      expect(() => validateDatabaseConfig()).toThrow(
        'SUPABASE_URL environment variable is required'
      );
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';

      expect(() => validateDatabaseConfig()).toThrow(
        'SUPABASE_SERVICE_ROLE_KEY environment variable is required'
      );
    });
  });

  describe('getAppConfig', () => {
    it('should return complete application configuration', () => {
      process.env.PLAID_CLIENT_ID = 'test-client-id';
      process.env.PLAID_SECRET = 'test-secret';
      process.env.PLAID_ENV = 'sandbox';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';

      const config = getAppConfig();

      expect(config).toEqual({
        plaid: {
          clientId: 'test-client-id',
          secret: 'test-secret',
          environment: 'sandbox',
          webhookUrl: 'https://example.com/api/plaid/webhook',
        },
        database: {
          url: 'https://test.supabase.co',
          serviceRoleKey: 'test-service-role-key',
        },
        siteUrl: 'https://example.com',
      });
    });
  });
});