import { z } from "zod";
declare const orgIdSchema: z.core.$ZodBranded<z.ZodString, "OrgId">;
declare const connectionIdSchema: z.core.$ZodBranded<z.ZodString, "ConnectionId">;
declare const transactionIdSchema: z.core.$ZodBranded<z.ZodString, "TransactionId">;
declare const categoryIdSchema: z.core.$ZodBranded<z.ZodString, "CategoryId">;
declare const exportIdSchema: z.core.$ZodBranded<z.ZodString, "ExportId">;
export type OrgId = z.infer<typeof orgIdSchema>;
export type ConnectionId = z.infer<typeof connectionIdSchema>;
export type TransactionId = z.infer<typeof transactionIdSchema>;
export type CategoryId = z.infer<typeof categoryIdSchema>;
export type ExportId = z.infer<typeof exportIdSchema>;
declare const orgCreateRequestSchema: z.ZodObject<{
    name: z.ZodString;
    industry: z.ZodString;
    timezone: z.ZodString;
    taxYearStart: z.ZodString;
}, z.core.$strip>;
declare const orgCreateResponseSchema: z.ZodObject<{
    orgId: z.core.$ZodBranded<z.ZodString, "OrgId">;
}, z.core.$strip>;
export type OrgCreateRequest = z.infer<typeof orgCreateRequestSchema>;
export type OrgCreateResponse = z.infer<typeof orgCreateResponseSchema>;
declare const connectionsListRequestSchema: z.ZodObject<{
    orgId: z.core.$ZodBranded<z.ZodString, "OrgId">;
}, z.core.$strip>;
declare const connectionSchema: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "ConnectionId">;
    provider: z.ZodEnum<{
        manual: "manual";
        plaid: "plaid";
        square: "square";
    }>;
    status: z.ZodEnum<{
        error: "error";
        active: "active";
        inactive: "inactive";
        pending: "pending";
    }>;
    scopes: z.ZodArray<z.ZodString>;
    createdAt: z.ZodString;
}, z.core.$strip>;
declare const connectionsListResponseSchema: z.ZodObject<{
    connections: z.ZodArray<z.ZodObject<{
        id: z.core.$ZodBranded<z.ZodString, "ConnectionId">;
        provider: z.ZodEnum<{
            manual: "manual";
            plaid: "plaid";
            square: "square";
        }>;
        status: z.ZodEnum<{
            error: "error";
            active: "active";
            inactive: "inactive";
            pending: "pending";
        }>;
        scopes: z.ZodArray<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ConnectionsListRequest = z.infer<typeof connectionsListRequestSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type ConnectionsListResponse = z.infer<typeof connectionsListResponseSchema>;
declare const connectionsCreateRequestSchema: z.ZodObject<{
    orgId: z.core.$ZodBranded<z.ZodString, "OrgId">;
    provider: z.ZodEnum<{
        manual: "manual";
        plaid: "plaid";
        square: "square";
    }>;
    scopes: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
declare const connectionsCreateResponseSchema: z.ZodObject<{
    connectionId: z.core.$ZodBranded<z.ZodString, "ConnectionId">;
}, z.core.$strip>;
export type ConnectionsCreateRequest = z.infer<typeof connectionsCreateRequestSchema>;
export type ConnectionsCreateResponse = z.infer<typeof connectionsCreateResponseSchema>;
declare const transactionsListRequestSchema: z.ZodObject<{
    orgId: z.core.$ZodBranded<z.ZodString, "OrgId">;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const transactionSchema: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "TransactionId">;
    date: z.ZodString;
    amountCents: z.ZodNumber;
    currency: z.ZodString;
    description: z.ZodString;
    merchantName: z.ZodString;
    mcc: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "CategoryId">>;
    confidence: z.ZodOptional<z.ZodNumber>;
    reviewed: z.ZodBoolean;
    source: z.ZodEnum<{
        manual: "manual";
        plaid: "plaid";
        square: "square";
    }>;
    raw: z.ZodUnknown;
}, z.core.$strip>;
declare const transactionsListResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.core.$ZodBranded<z.ZodString, "TransactionId">;
        date: z.ZodString;
        amountCents: z.ZodNumber;
        currency: z.ZodString;
        description: z.ZodString;
        merchantName: z.ZodString;
        mcc: z.ZodOptional<z.ZodString>;
        categoryId: z.ZodOptional<z.core.$ZodBranded<z.ZodString, "CategoryId">>;
        confidence: z.ZodOptional<z.ZodNumber>;
        reviewed: z.ZodBoolean;
        source: z.ZodEnum<{
            manual: "manual";
            plaid: "plaid";
            square: "square";
        }>;
        raw: z.ZodUnknown;
    }, z.core.$strip>>;
    nextCursor: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type TransactionsListRequest = z.infer<typeof transactionsListRequestSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionsListResponse = z.infer<typeof transactionsListResponseSchema>;
declare const categorizeRunRequestSchema: z.ZodObject<{
    orgId: z.core.$ZodBranded<z.ZodString, "OrgId">;
    transactionIds: z.ZodArray<z.core.$ZodBranded<z.ZodString, "TransactionId">>;
}, z.core.$strip>;
declare const categorizeResultSchema: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "TransactionId">;
    categoryId: z.core.$ZodBranded<z.ZodString, "CategoryId">;
    confidence: z.ZodNumber;
    rationale: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const categorizeRunResponseSchema: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        id: z.core.$ZodBranded<z.ZodString, "TransactionId">;
        categoryId: z.core.$ZodBranded<z.ZodString, "CategoryId">;
        confidence: z.ZodNumber;
        rationale: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CategorizeRunRequest = z.infer<typeof categorizeRunRequestSchema>;
export type CategorizeResult = z.infer<typeof categorizeResultSchema>;
export type CategorizeRunResponse = z.infer<typeof categorizeRunResponseSchema>;
declare const exportsCreateRequestSchema: z.ZodObject<{
    orgId: z.core.$ZodBranded<z.ZodString, "OrgId">;
    type: z.ZodEnum<{
        csv: "csv";
        qbo: "qbo";
        xero: "xero";
    }>;
    params: z.ZodUnknown;
}, z.core.$strip>;
declare const exportsCreateResponseSchema: z.ZodObject<{
    exportId: z.core.$ZodBranded<z.ZodString, "ExportId">;
}, z.core.$strip>;
export type ExportsCreateRequest = z.infer<typeof exportsCreateRequestSchema>;
export type ExportsCreateResponse = z.infer<typeof exportsCreateResponseSchema>;
export { orgCreateRequestSchema, orgCreateResponseSchema, connectionsListRequestSchema, connectionsListResponseSchema, connectionsCreateRequestSchema, connectionsCreateResponseSchema, transactionsListRequestSchema, transactionsListResponseSchema, categorizeRunRequestSchema, categorizeRunResponseSchema, exportsCreateRequestSchema, exportsCreateResponseSchema, connectionSchema, transactionSchema, categorizeResultSchema, };
//# sourceMappingURL=contracts.d.ts.map