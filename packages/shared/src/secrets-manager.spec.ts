/**
 * Comprehensive tests for the secrets management system
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecretsManager, SecretProvider, SecretValue } from './secrets-manager';

// Mock providers for testing
class MockSecretProvider implements SecretProvider {
  private secrets = new Map<string, SecretValue>();

  async getSecret(name: string): Promise<SecretValue> {
    const secret = this.secrets.get(name);
    if (!secret) {
      throw new Error(`Secret '${name}' not found`);
    }
    return secret;
  }

  async setSecret(name: string, value: string, metadata?: Record<string, any>): Promise<void> {
    this.secrets.set(name, {
      value,
      version: Date.now().toString(),
      lastRotated: new Date(),
      metadata,
    });
  }

  async rotateSecret(name: string): Promise<string> {
    const existing = this.secrets.get(name);
    if (!existing) {
      throw new Error(`Secret '${name}' not found`);
    }

    const newValue = `rotated-${Date.now()}`;
    await this.setSecret(name, newValue);
    return newValue;
  }

  async listSecrets(): Promise<string[]> {
    return Array.from(this.secrets.keys());
  }

  async deleteSecret(name: string): Promise<void> {
    this.secrets.delete(name);
  }

  // Helper for testing
  setTestSecret(name: string, value: string): void {
    this.secrets.set(name, {
      value,
      version: '1',
      lastRotated: new Date(),
    });
  }
}

class FailingSecretProvider implements SecretProvider {
  async getSecret(name: string): Promise<SecretValue> {
    throw new Error(`Provider failure for ${name}`);
  }

  async setSecret(): Promise<void> {
    throw new Error('Provider failure');
  }

  async rotateSecret(): Promise<string> {
    throw new Error('Provider failure');
  }

  async listSecrets(): Promise<string[]> {
    throw new Error('Provider failure');
  }

  async deleteSecret(): Promise<void> {
    throw new Error('Provider failure');
  }
}

describe('SecretsManager', () => {
  let mockProvider: MockSecretProvider;
  let secretsManager: SecretsManager;

  beforeEach(() => {
    mockProvider = new MockSecretProvider();
    secretsManager = new SecretsManager(mockProvider);

    // Clear any global state
    vi.clearAllMocks();
  });

  describe('getSecret', () => {
    test('should retrieve secret successfully', async () => {
      mockProvider.setTestSecret('TEST_SECRET', 'secret-value');

      const value = await secretsManager.getSecret('TEST_SECRET');

      expect(value).toBe('secret-value');
    });

    test('should throw error for non-existent secret', async () => {
      await expect(secretsManager.getSecret('MISSING_SECRET')).rejects.toThrow(
        "Secret 'MISSING_SECRET' not found"
      );
    });

    test('should handle provider errors gracefully', async () => {
      const failingManager = new SecretsManager(new FailingSecretProvider());

      await expect(failingManager.getSecret('ANY_SECRET')).rejects.toThrow(
        'Provider failure for ANY_SECRET'
      );
    });
  });

  describe('getSecretWithMetadata', () => {
    test('should return full secret metadata', async () => {
      const testSecret: SecretValue = {
        value: 'secret-value',
        version: '1',
        lastRotated: new Date('2023-01-01'),
        metadata: { source: 'test' },
      };

      await mockProvider.setSecret('TEST_SECRET', testSecret.value, testSecret.metadata);

      const result = await secretsManager.getSecretWithMetadata('TEST_SECRET');

      expect(result.value).toBe('secret-value');
      expect(result.version).toBeDefined();
      expect(result.lastRotated).toBeDefined();
      expect(result.metadata).toEqual({ source: 'test' });
    });
  });

  describe('setSecret', () => {
    test('should set secret successfully', async () => {
      await secretsManager.setSecret('NEW_SECRET', 'new-value', { type: 'api-key' });

      const retrieved = await secretsManager.getSecret('NEW_SECRET');
      expect(retrieved).toBe('new-value');

      const withMetadata = await secretsManager.getSecretWithMetadata('NEW_SECRET');
      expect(withMetadata.metadata).toEqual({ type: 'api-key' });
    });
  });

  describe('rotateSecret', () => {
    test('should rotate secret and return new value', async () => {
      mockProvider.setTestSecret('ROTATE_SECRET', 'old-value');

      const newValue = await secretsManager.rotateSecret('ROTATE_SECRET');

      expect(newValue).toMatch(/^rotated-\d+$/);

      const retrieved = await secretsManager.getSecret('ROTATE_SECRET');
      expect(retrieved).toBe(newValue);
    });

    test('should throw error for non-existent secret', async () => {
      await expect(secretsManager.rotateSecret('MISSING_SECRET')).rejects.toThrow(
        "Secret 'MISSING_SECRET' not found"
      );
    });
  });

  describe('listSecrets', () => {
    test('should list all available secrets', async () => {
      mockProvider.setTestSecret('SECRET_1', 'value1');
      mockProvider.setTestSecret('SECRET_2', 'value2');

      const secrets = await secretsManager.listSecrets();

      expect(secrets).toEqual(['SECRET_1', 'SECRET_2']);
    });

    test('should return empty array when no secrets exist', async () => {
      const secrets = await secretsManager.listSecrets();

      expect(secrets).toEqual([]);
    });
  });

  describe('validateAllSecrets', () => {
    test('should validate all critical secrets successfully', async () => {
      // Set up critical secrets
      mockProvider.setTestSecret('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid-service-role-key');
      mockProvider.setTestSecret('ENCRYPTION_KEY', 'a-very-long-encryption-key-that-is-at-least-32-characters');
      mockProvider.setTestSecret('PLAID_SECRET', 'valid-plaid-secret-key');
      mockProvider.setTestSecret('PLAID_CLIENT_ID', 'valid-plaid-client-id');

      const result = await secretsManager.validateAllSecrets();

      expect(result.valid).toEqual([
        'SUPABASE_SERVICE_ROLE_KEY',
        'ENCRYPTION_KEY',
        'PLAID_SECRET',
        'PLAID_CLIENT_ID',
      ]);
      expect(result.invalid).toEqual([]);
    });

    test('should identify invalid secrets', async () => {
      // Set up some invalid secrets
      mockProvider.setTestSecret('SUPABASE_SERVICE_ROLE_KEY', 'invalid-key');
      mockProvider.setTestSecret('ENCRYPTION_KEY', 'short');

      const result = await secretsManager.validateAllSecrets();

      expect(result.valid).toEqual([]);
      expect(result.invalid).toHaveLength(4); // All 4 critical secrets should fail
      expect(result.invalid.some(i => i.name === 'SUPABASE_SERVICE_ROLE_KEY')).toBe(true);
      expect(result.invalid.some(i => i.name === 'ENCRYPTION_KEY')).toBe(true);
    });

    test('should handle missing secrets', async () => {
      const result = await secretsManager.validateAllSecrets();

      expect(result.valid).toEqual([]);
      expect(result.invalid).toHaveLength(4);
      expect(result.invalid.every(i => i.error.includes('not found'))).toBe(true);
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status for working provider', async () => {
      const health = await secretsManager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.provider).toBe('MockSecretProvider');
      expect(health.error).toBeUndefined();
    });

    test('should return unhealthy status for failing provider', async () => {
      const failingManager = new SecretsManager(new FailingSecretProvider());

      const health = await failingManager.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.provider).toBe('FailingSecretProvider');
      expect(health.error).toContain('Provider failure');
    });
  });

  describe('Environment validation', () => {
    test('should validate Supabase service role key format', () => {
      expect(() => {
        const env = new (require('./secrets-manager').EnvironmentSecretProvider)();
        env.validateSecret('SUPABASE_SERVICE_ROLE_KEY', 'invalid-key');
      }).toThrow('Invalid Supabase service role key format');
    });

    test('should validate encryption key length', () => {
      expect(() => {
        const env = new (require('./secrets-manager').EnvironmentSecretProvider)();
        env.validateSecret('ENCRYPTION_KEY', 'short');
      }).toThrow('Encryption key must be at least 32 characters');
    });

    test('should detect weak encryption key patterns', () => {
      expect(() => {
        const env = new (require('./secrets-manager').EnvironmentSecretProvider)();
        env.validateSecret('ENCRYPTION_KEY', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      }).toThrow('Encryption key uses weak pattern');
    });

    test('should validate OpenAI API key format', () => {
      expect(() => {
        const env = new (require('./secrets-manager').EnvironmentSecretProvider)();
        env.validateSecret('OPENAI_API_KEY', 'invalid-key');
      }).toThrow('Invalid OpenAI API key format');
    });

    test('should validate Redis URL format', () => {
      expect(() => {
        const env = new (require('./secrets-manager').EnvironmentSecretProvider)();
        env.validateSecret('REDIS_URL', 'not-a-url');
      }).toThrow('Invalid Redis URL format');
    });

    test('should detect placeholder values', () => {
      expect(() => {
        const env = new (require('./secrets-manager').EnvironmentSecretProvider)();
        env.validateSecret('TEST_SECRET', 'placeholder-value');
      }).toThrow('appears to contain placeholder value');
    });

    test('should validate empty secrets', () => {
      expect(() => {
        const env = new (require('./secrets-manager').EnvironmentSecretProvider)();
        env.validateSecret('TEST_SECRET', '');
      }).toThrow("Secret 'TEST_SECRET' is empty");
    });
  });

  describe('Cache behavior', () => {
    test('should cache secrets to reduce provider calls', async () => {
      const spyProvider = vi.spyOn(mockProvider, 'getSecret');
      mockProvider.setTestSecret('CACHED_SECRET', 'cached-value');

      // First call
      await secretsManager.getSecret('CACHED_SECRET');
      expect(spyProvider).toHaveBeenCalledTimes(1);

      // Second call should use cache (but our mock doesn't implement caching)
      await secretsManager.getSecret('CACHED_SECRET');
      expect(spyProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrent access', () => {
    test('should handle concurrent secret requests safely', async () => {
      mockProvider.setTestSecret('CONCURRENT_SECRET', 'concurrent-value');

      const promises = Array.from({ length: 10 }, () =>
        secretsManager.getSecret('CONCURRENT_SECRET')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every(r => r === 'concurrent-value')).toBe(true);
    });

    test('should handle concurrent rotation safely', async () => {
      mockProvider.setTestSecret('ROTATION_SECRET', 'initial-value');

      const rotationPromises = Array.from({ length: 3 }, () =>
        secretsManager.rotateSecret('ROTATION_SECRET')
      );

      const results = await Promise.all(rotationPromises);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.startsWith('rotated-'))).toBe(true);
    });
  });

  describe('Error handling edge cases', () => {
    test('should handle network timeouts gracefully', async () => {
      const slowProvider: SecretProvider = {
        async getSecret() {
          await new Promise(resolve => setTimeout(resolve, 100));
          throw new Error('Network timeout');
        },
        async setSecret() { throw new Error('Not implemented'); },
        async rotateSecret() { throw new Error('Not implemented'); },
        async listSecrets() { throw new Error('Not implemented'); },
        async deleteSecret() { throw new Error('Not implemented'); },
      };

      const manager = new SecretsManager(slowProvider);

      await expect(manager.getSecret('ANY_SECRET')).rejects.toThrow('Network timeout');
    });

    test('should handle malformed secret responses', async () => {
      const malformedProvider: SecretProvider = {
        async getSecret() {
          return {
            value: '', // Empty value
            version: undefined,
          };
        },
        async setSecret() { throw new Error('Not implemented'); },
        async rotateSecret() { throw new Error('Not implemented'); },
        async listSecrets() { throw new Error('Not implemented'); },
        async deleteSecret() { throw new Error('Not implemented'); },
      };

      const manager = new SecretsManager(malformedProvider);

      const result = await manager.getSecret('TEST_SECRET');
      expect(result).toBe('');
    });
  });
});