import { beforeAll } from 'vitest';
import * as dotenv from 'dotenv';

beforeAll(() => {
  // Load environment variables for testing
  dotenv.config();
  
  // Verify required environment variables
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'];
  
  for (const env of required) {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}`);
    }
  }
});