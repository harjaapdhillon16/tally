import { beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import { join } from 'path';

beforeAll(() => {
  // Load environment variables for testing from multiple locations
  // Load from root directory first
  dotenv.config();
  
  // Load from apps/web/.env.local (highest priority)
  dotenv.config({ path: join(process.cwd(), 'apps/web/.env.local') });
  
  // Load from apps/web/.env
  dotenv.config({ path: join(process.cwd(), 'apps/web/.env') });
  
  // Map Next.js public variables to expected names for tests
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  
  // Verify required environment variables
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'];
  
  for (const env of required) {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}. Please check your .env files in apps/web/`);
    }
  }
  
  console.log('✅ Environment variables loaded for e2e tests:');
  console.log(`   - SUPABASE_URL: ${process.env.SUPABASE_URL?.substring(0, 20)}...`);
  console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10)}...`);
  console.log(`   - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY?.substring(0, 10)}...`);
});