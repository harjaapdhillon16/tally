/**
 * Comprehensive secret management system with rotation, validation, and secure access
 * Supports multiple backends: AWS Secrets Manager, HashiCorp Vault, and secure environment variables
 */

export interface SecretValue {
  value: string;
  version?: string;
  lastRotated?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface SecretProvider {
  getSecret(name: string): Promise<SecretValue>;
  setSecret(name: string, value: string, metadata?: Record<string, any>): Promise<void>;
  rotateSecret(name: string): Promise<string>;
  listSecrets(): Promise<string[]>;
  deleteSecret(name: string): Promise<void>;
}

/**
 * Environment-based secret provider with validation and caching
 */
class EnvironmentSecretProvider implements SecretProvider {
  private cache = new Map<string, { value: SecretValue; expiry: number }>();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes

  async getSecret(name: string): Promise<SecretValue> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    const envValue = this.getEnvVar(name);
    if (!envValue) {
      throw new Error(`Secret '${name}' not found in environment`);
    }

    const secretValue: SecretValue = {
      value: envValue,
      version: '1',
      lastRotated: new Date(),
    };

    // Validate secret format
    this.validateSecret(name, envValue);

    // Cache the result
    this.cache.set(name, {
      value: secretValue,
      expiry: Date.now() + this.cacheTtl,
    });

    return secretValue;
  }

  async setSecret(name: string, value: string): Promise<void> {
    throw new Error('Cannot set environment variables at runtime');
  }

  async rotateSecret(name: string): Promise<string> {
    throw new Error('Environment variable rotation not supported');
  }

  async listSecrets(): Promise<string[]> {
    // Return only known secret patterns
    const knownPatterns = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'ENCRYPTION_KEY',
      'PLAID_SECRET',
      'PLAID_WEBHOOK_SECRET',
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'SENTRY_DSN',
      'REDIS_URL',
    ];

    return knownPatterns.filter(pattern => this.getEnvVar(pattern));
  }

  async deleteSecret(name: string): Promise<void> {
    throw new Error('Cannot delete environment variables');
  }

  private getEnvVar(key: string): string | undefined {
    // Handle both Node.js and Deno environments
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    // @ts-ignore: Deno global may not be available in all environments
    if (typeof Deno !== 'undefined' && Deno?.env?.get) {
      // @ts-ignore: Deno global may not be available in all environments
      return Deno.env.get(key);
    }
    return undefined;
  }

  private validateSecret(name: string, value: string): void {
    // Comprehensive secret validation rules
    const rules: Record<string, (value: string) => void> = {
      SUPABASE_SERVICE_ROLE_KEY: (v) => {
        if (!v.startsWith('eyJ') || v.length < 50) {
          throw new Error('Invalid Supabase service role key format');
        }
      },
      ENCRYPTION_KEY: (v) => {
        if (v.length < 32) {
          throw new Error('Encryption key must be at least 32 characters');
        }
        if (/^(.)\1*$/.test(v)) {
          throw new Error('Encryption key uses weak pattern');
        }
      },
      PLAID_SECRET: (v) => {
        if (v.length < 10) {
          throw new Error('Plaid secret appears too short');
        }
      },
      PLAID_CLIENT_ID: (v) => {
        if (v.length < 10) {
          throw new Error('Plaid client ID appears too short');
        }
      },
      OPENAI_API_KEY: (v) => {
        if (!v.startsWith('sk-') || v.length < 20) {
          throw new Error('Invalid OpenAI API key format');
        }
      },
      GEMINI_API_KEY: (v) => {
        if (v.length < 20) {
          throw new Error('Gemini API key appears too short');
        }
      },
      REDIS_URL: (v) => {
        try {
          new URL(v);
        } catch {
          throw new Error('Invalid Redis URL format');
        }
      },
    };

    const validator = rules[name];
    if (validator) {
      validator(value);
    }

    // Common validations for all secrets
    if (value.length === 0) {
      throw new Error(`Secret '${name}' is empty`);
    }

    // Check for common placeholder values
    const placeholders = ['placeholder', 'changeme', 'secret', 'password', 'key'];
    if (placeholders.some(p => value.toLowerCase().includes(p))) {
      throw new Error(`Secret '${name}' appears to contain placeholder value`);
    }

    // Warn about potential issues
    if (value.includes(' ')) {
      console.warn(`Warning: Secret '${name}' contains whitespace`);
    }
  }
}

/**
 * AWS Secrets Manager provider (for production environments)
 */
class AWSSecretsProvider implements SecretProvider {
  private client: any;

  constructor(region = 'us-east-1') {
    // Lazy load AWS SDK to avoid bundle size in environments that don't need it
    try {
      const AWS = require('@aws-sdk/client-secrets-manager');
      this.client = new AWS.SecretsManagerClient({ region });
    } catch (error) {
      throw new Error('AWS SDK not available. Install @aws-sdk/client-secrets-manager');
    }
  }

  async getSecret(name: string): Promise<SecretValue> {
    try {
      const command = { SecretId: name };
      const response = await this.client.send(new (require('@aws-sdk/client-secrets-manager')).GetSecretValueCommand(command));

      return {
        value: response.SecretString || '',
        version: response.VersionId,
        lastRotated: response.CreatedDate,
        metadata: {
          arn: response.ARN,
          name: response.Name,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve secret '${name}': ${error.message}`);
    }
  }

  async setSecret(name: string, value: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const command = {
        SecretId: name,
        SecretString: value,
        Description: metadata?.description,
      };

      await this.client.send(new (require('@aws-sdk/client-secrets-manager')).UpdateSecretCommand(command));
    } catch (error: any) {
      throw new Error(`Failed to set secret '${name}': ${error.message}`);
    }
  }

  async rotateSecret(name: string): Promise<string> {
    try {
      const command = { SecretId: name };
      const response = await this.client.send(new (require('@aws-sdk/client-secrets-manager')).RotateSecretCommand(command));
      return response.VersionId || '';
    } catch (error: any) {
      throw new Error(`Failed to rotate secret '${name}': ${error.message}`);
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const command = {};
      const response = await this.client.send(new (require('@aws-sdk/client-secrets-manager')).ListSecretsCommand(command));
      return response.SecretList?.map((s: any) => s.Name).filter(Boolean) || [];
    } catch (error: any) {
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  async deleteSecret(name: string): Promise<void> {
    try {
      const command = { SecretId: name };
      await this.client.send(new (require('@aws-sdk/client-secrets-manager')).DeleteSecretCommand(command));
    } catch (error: any) {
      throw new Error(`Failed to delete secret '${name}': ${error.message}`);
    }
  }
}

/**
 * HashiCorp Vault provider (for on-premises or hybrid deployments)
 */
class VaultSecretProvider implements SecretProvider {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.token = token;
  }

  async getSecret(name: string): Promise<SecretValue> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/secret/data/${name}`, {
        headers: {
          'X-Vault-Token': this.token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status}`);
      }

      const data = await response.json();
      const secretData = data.data?.data;

      if (!secretData) {
        throw new Error(`Secret '${name}' not found`);
      }

      const result: SecretValue = {
        value: secretData.value || '',
        version: data.data?.metadata?.version?.toString(),
        metadata: data.data?.metadata,
      };

      if (data.data?.metadata?.created_time) {
        result.lastRotated = new Date(data.data.metadata.created_time);
      }

      return result;
    } catch (error: any) {
      throw new Error(`Failed to retrieve secret '${name}' from Vault: ${error.message}`);
    }
  }

  async setSecret(name: string, value: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/secret/data/${name}`, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { value, ...metadata },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to set secret '${name}' in Vault: ${error.message}`);
    }
  }

  async rotateSecret(name: string): Promise<string> {
    // Vault doesn't have built-in rotation, so we generate a new value
    const newValue = this.generateSecureValue();
    await this.setSecret(name, newValue);
    return 'rotated';
  }

  async listSecrets(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/secret/metadata`, {
        method: 'LIST',
        headers: {
          'X-Vault-Token': this.token,
        },
      });

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.keys || [];
    } catch (error: any) {
      throw new Error(`Failed to list secrets from Vault: ${error.message}`);
    }
  }

  async deleteSecret(name: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/secret/metadata/${name}`, {
        method: 'DELETE',
        headers: {
          'X-Vault-Token': this.token,
        },
      });

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to delete secret '${name}' from Vault: ${error.message}`);
    }
  }

  private generateSecureValue(): string {
    // Generate a cryptographically secure random value
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Unified secrets manager with automatic provider selection
 */
export class SecretsManager {
  private provider: SecretProvider;

  constructor(customProvider?: SecretProvider) {
    if (customProvider) {
      this.provider = customProvider;
      return;
    }

    // Auto-select provider based on environment
    const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    const vaultUrl = process.env.VAULT_URL;
    const vaultToken = process.env.VAULT_TOKEN;

    if (awsRegion && process.env.NODE_ENV === 'production') {
      console.log('Using AWS Secrets Manager for secret storage');
      this.provider = new AWSSecretsProvider(awsRegion);
    } else if (vaultUrl && vaultToken) {
      console.log('Using HashiCorp Vault for secret storage');
      this.provider = new VaultSecretProvider(vaultUrl, vaultToken);
    } else {
      console.log('Using environment variables for secret storage');
      this.provider = new EnvironmentSecretProvider();
    }
  }

  /**
   * Get a secret value with automatic validation
   */
  async getSecret(name: string): Promise<string> {
    try {
      const secret = await this.provider.getSecret(name);
      return secret.value;
    } catch (error) {
      console.error(`Failed to retrieve secret '${name}':`, error);
      throw error;
    }
  }

  /**
   * Get secret with full metadata
   */
  async getSecretWithMetadata(name: string): Promise<SecretValue> {
    return await this.provider.getSecret(name);
  }

  /**
   * Set a secret value
   */
  async setSecret(name: string, value: string, metadata?: Record<string, any>): Promise<void> {
    await this.provider.setSecret(name, value, metadata);
  }

  /**
   * Rotate a secret and return the new version
   */
  async rotateSecret(name: string): Promise<string> {
    return await this.provider.rotateSecret(name);
  }

  /**
   * List all available secrets
   */
  async listSecrets(): Promise<string[]> {
    return await this.provider.listSecrets();
  }

  /**
   * Validate all critical secrets at startup
   */
  async validateAllSecrets(): Promise<{ valid: string[]; invalid: { name: string; error: string }[] }> {
    const valid: string[] = [];
    const invalid: { name: string; error: string }[] = [];

    const criticalSecrets = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'ENCRYPTION_KEY',
      'PLAID_SECRET',
      'PLAID_CLIENT_ID',
    ];

    for (const secretName of criticalSecrets) {
      try {
        await this.getSecret(secretName);
        valid.push(secretName);
      } catch (error) {
        invalid.push({
          name: secretName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * Health check for the secrets provider
   */
  async healthCheck(): Promise<{ healthy: boolean; provider: string; error?: string }> {
    try {
      await this.provider.listSecrets();
      return {
        healthy: true,
        provider: this.provider.constructor.name,
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.provider.constructor.name,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Global secrets manager instance
let globalSecretsManager: SecretsManager | null = null;

export function getSecretsManager(): SecretsManager {
  if (!globalSecretsManager) {
    globalSecretsManager = new SecretsManager();
  }
  return globalSecretsManager;
}

/**
 * Convenience function to get a secret
 */
export async function getSecret(name: string): Promise<string> {
  const manager = getSecretsManager();
  return await manager.getSecret(name);
}

/**
 * Validate environment on startup
 */
export async function validateSecretsEnvironment(): Promise<void> {
  const manager = getSecretsManager();
  const { valid, invalid } = await manager.validateAllSecrets();

  if (invalid.length > 0) {
    const errorMessages = invalid.map(i => `${i.name}: ${i.error}`).join('\n');
    throw new Error(`Critical secrets validation failed:\n${errorMessages}`);
  }

  console.log(`Secrets validation passed for: ${valid.join(', ')}`);
}