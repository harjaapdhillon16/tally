import { NextRequest } from "next/server";
import { connectionsCreateRequestSchema, } from "@nexus/types/contracts";
import { withOrg, createValidationErrorResponse, createErrorResponse } from "@/lib/api/with-org";
export async function POST(request) {
    try {
        // Parse and validate request body
        const body = await request.json();
        let validatedRequest;
        try {
            validatedRequest = connectionsCreateRequestSchema.parse(body);
        }
        catch (error) {
            return createValidationErrorResponse(error);
        }
        // Verify org membership
        await withOrg(validatedRequest.orgId);
        // TODO: Implement actual connection creation logic
        // For now, return stubbed response with correct shape
        const stubResponse = {
            connectionId: `conn_${Date.now()}_${validatedRequest.provider}`,
        };
        return Response.json(stubResponse);
    }
    catch (error) {
        if (error instanceof Response) {
            return error;
        }
        console.error("Error in POST /api/connections/create:", error);
        return createErrorResponse("Internal server error", 500);
    }
}
//# sourceMappingURL=route.js.map