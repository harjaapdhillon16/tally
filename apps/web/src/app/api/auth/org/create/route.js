import { NextRequest } from "next/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { orgCreateRequestSchema, } from "@nexus/types/contracts";
import { createErrorResponse, createValidationErrorResponse } from "@/lib/api/with-org";
export async function POST(request) {
    try {
        const supabase = createServerComponentClient({ cookies });
        // Check authentication
        const { data: { user }, error: authError, } = await supabase.auth.getUser();
        if (authError || !user) {
            return createErrorResponse("Unauthorized", 401);
        }
        // Parse and validate request body
        const body = await request.json();
        let validatedRequest;
        try {
            validatedRequest = orgCreateRequestSchema.parse(body);
        }
        catch (error) {
            return createValidationErrorResponse(error);
        }
        // TODO: Implement actual organization creation logic
        // Use validatedRequest for future implementation
        console.log('Creating org with request:', validatedRequest);
        // For now, return stubbed response with correct shape
        const stubResponse = {
            orgId: `org_${Date.now()}`,
        };
        return Response.json(stubResponse);
    }
    catch (error) {
        console.error("Error in POST /api/auth/org/create:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
//# sourceMappingURL=route.js.map