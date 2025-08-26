/**
 * Get Supabase client with service role key (bypasses RLS)
 * Use for admin operations, migrations, and background jobs
 */
export declare function getAdminClient(): import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
/**
 * Get Supabase client with anonymous key (respects RLS)
 * Use for normal application operations
 */
export declare function getClient(): import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
//# sourceMappingURL=index.d.ts.map