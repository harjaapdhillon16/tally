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
        // Use the secure function instead of direct table insertion
        const { data: result, error: createError } = await supabase
            .rpc('create_organization_with_owner', {
            org_name: validatedRequest.name,
            org_industry: validatedRequest.industry,
            org_timezone: validatedRequest.timezone
        });
        if (createError) {
            console.error('Error creating organization:', createError);
            return createErrorResponse("Failed to create organization", 500);
        }
        const stubResponse = {
            orgId: result,
        };
        return Response.json(stubResponse);
    }
    catch (error) {
        console.error("Error in POST /api/auth/org/create:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
//# sourceMappingURL=route.js.map