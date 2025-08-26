import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
export async function withOrg(orgId) {
    const supabase = createServerComponentClient({ cookies });
    // Get authenticated user
    const { data: { user }, error: authError, } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    // Check user belongs to organization
    const { data: membership, error: membershipError } = await supabase
        .from("user_org_roles")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .single();
    if (membershipError || !membership) {
        throw new Response(JSON.stringify({ error: "Access denied to organization" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }
    return {
        userId: user.id,
        orgId,
    };
}
export function createErrorResponse(message, status) {
    return Response.json({ error: message }, { status });
}
export function createValidationErrorResponse(error) {
    return Response.json({
        error: "Validation failed",
        details: error,
    }, { status: 400 });
}
//# sourceMappingURL=with-org.js.map