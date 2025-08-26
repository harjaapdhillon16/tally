import { createClientComponentClient, createServerComponentClient, createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for client components
 */
export function createClient() {
  return createClientComponentClient();
}

/**
 * Creates a Supabase client for server components and route handlers
 */
export function createServerClient() {
  return createServerComponentClient({ cookies });
}

/**
 * Creates a Supabase client for middleware
 */
export function createMiddlewareSupabaseClient(req: NextRequest, res: NextResponse) {
  return createMiddlewareClient({ req, res });
}