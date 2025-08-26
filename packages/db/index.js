import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
// Load environment variables from project root if not already loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    dotenv.config({ path: resolve(process.cwd(), '../../.env') });
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}
if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}
/**
 * Get Supabase client with service role key (bypasses RLS)
 * Use for admin operations, migrations, and background jobs
 */
export function getAdminClient() {
    return createClient(supabaseUrl, serviceRoleKey);
}
/**
 * Get Supabase client with anonymous key (respects RLS)
 * Use for normal application operations
 */
export function getClient() {
    return createClient(supabaseUrl, anonKey);
}
//# sourceMappingURL=index.js.map