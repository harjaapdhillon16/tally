import { NextRequest } from "next/server";
import {
  type ConnectionsListResponse,
  type ConnectionId,
} from "@nexus/types/contracts";
import { withOrgFromRequest, createErrorResponse } from "@/lib/api/with-org";

export async function GET(request: NextRequest) {
  try {
    // Verify org membership and get context
    await withOrgFromRequest(request);

    // TODO: Implement actual connections retrieval logic
    // For now, return stubbed response with correct shape
    const stubResponse: ConnectionsListResponse = {
      connections: [
        {
          id: `conn_${Date.now()}_1` as ConnectionId,
          provider: "plaid",
          status: "active",
          scopes: ["transactions", "accounts"],
          createdAt: new Date().toISOString(),
        },
        {
          id: `conn_${Date.now()}_2` as ConnectionId,
          provider: "square",
          status: "active",
          scopes: ["transactions"],
          createdAt: new Date().toISOString(),
        },
      ],
    };

    return Response.json(stubResponse);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Error in GET /api/connections/list:", error);
    return createErrorResponse("Internal server error", 500);
  }
}