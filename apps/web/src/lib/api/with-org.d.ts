import type { OrgId } from "@nexus/types/contracts";
export interface AuthenticatedContext {
    userId: string;
    orgId: OrgId;
}
export declare function withOrg(orgId: OrgId): Promise<AuthenticatedContext>;
export declare function createErrorResponse(message: string, status: number): Response;
export declare function createValidationErrorResponse(error: unknown): Response;
//# sourceMappingURL=with-org.d.ts.map