export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'development' | 'production';
  webhookUrl: string;
}

export interface DatabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export interface AppConfig {
  plaid: PlaidConfig;
  database: DatabaseConfig;
  siteUrl: string;
}

function getEnvVar(key: string): string | undefined {
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

export function validatePlaidConfig(): PlaidConfig {
  const clientId = getEnvVar('PLAID_CLIENT_ID');
  const secret = getEnvVar('PLAID_SECRET');
  const environment = (getEnvVar('PLAID_ENV') || 'sandbox') as PlaidConfig['environment'];
  const siteUrl = getEnvVar('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';

  if (!clientId) {
    throw new Error('PLAID_CLIENT_ID environment variable is required');
  }

  if (!secret) {
    throw new Error('PLAID_SECRET environment variable is required');
  }

  if (!['sandbox', 'development', 'production'].includes(environment)) {
    throw new Error(`Invalid PLAID_ENV: ${environment}. Must be sandbox, development, or production`);
  }

  return {
    clientId,
    secret,
    environment,
    webhookUrl: `${siteUrl}/api/plaid/webhook`,
  };
}

export function validateDatabaseConfig(): DatabaseConfig {
  const url = getEnvVar('SUPABASE_URL');
  const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

  if (!url) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  return { url, serviceRoleKey };
}

export function getAppConfig(): AppConfig {
  return {
    plaid: validatePlaidConfig(),
    database: validateDatabaseConfig(),
    siteUrl: getEnvVar('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000',
  };
}