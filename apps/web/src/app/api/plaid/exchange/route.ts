import { NextRequest } from "next/server";
import { withOrgFromRequest, createErrorResponse } from "@/lib/api/with-org";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    await withOrgFromRequest(request);
    
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createErrorResponse("Unauthorized", 401);
    }
    
    // Get session for access token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return createErrorResponse("No session token", 401);
    }

    const body = await request.json();
    
    // Proxy to Edge Function with session token
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid/exchange`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error('Edge function call failed');
    }

    const result = await response.json();
    return Response.json(result);

  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error in Plaid exchange:", error);
    return createErrorResponse("Exchange failed", 500);
  }
}