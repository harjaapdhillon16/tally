import { z } from "zod";
// Common schemas
const orgIdSchema = z.string().brand();
const connectionIdSchema = z.string().brand();
const transactionIdSchema = z.string().brand();
const categoryIdSchema = z.string().brand();
const exportIdSchema = z.string().brand();
// POST /auth/org.create
const orgCreateRequestSchema = z.object({
    name: z.string().min(1),
    industry: z.string().min(1),
    timezone: z.string().min(1),
    taxYearStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const orgCreateResponseSchema = z.object({
    orgId: orgIdSchema,
});
// GET /connections.list
const connectionsListRequestSchema = z.object({
    orgId: orgIdSchema,
});
const connectionSchema = z.object({
    id: connectionIdSchema,
    provider: z.enum(["plaid", "square", "manual"]),
    status: z.enum(["active", "inactive", "error", "pending"]),
    scopes: z.array(z.string()),
    createdAt: z.string().datetime(),
});
const connectionsListResponseSchema = z.object({
    connections: z.array(connectionSchema),
});
// POST /connections.create
const connectionsCreateRequestSchema = z.object({
    orgId: orgIdSchema,
    provider: z.enum(["plaid", "square", "manual"]),
    scopes: z.array(z.string()),
});
const connectionsCreateResponseSchema = z.object({
    connectionId: connectionIdSchema,
});
// GET /transactions.list
const transactionsListRequestSchema = z.object({
    orgId: orgIdSchema,
    cursor: z.string().optional(),
    limit: z.number().int().positive().max(1000).optional(),
});
const transactionSchema = z.object({
    id: transactionIdSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amountCents: z.number().int(),
    currency: z.string().length(3),
    description: z.string(),
    merchantName: z.string(),
    mcc: z.string().optional(),
    categoryId: categoryIdSchema.optional(),
    confidence: z.number().min(0).max(1).optional(),
    reviewed: z.boolean(),
    source: z.enum(["plaid", "square", "manual"]),
    raw: z.unknown(),
});
const transactionsListResponseSchema = z.object({
    items: z.array(transactionSchema),
    nextCursor: z.string().optional(),
});
// POST /categorize.run
const categorizeRunRequestSchema = z.object({
    orgId: orgIdSchema,
    transactionIds: z.array(transactionIdSchema),
});
const categorizeResultSchema = z.object({
    id: transactionIdSchema,
    categoryId: categoryIdSchema,
    confidence: z.number().min(0).max(1),
    rationale: z.string().optional(),
});
const categorizeRunResponseSchema = z.object({
    results: z.array(categorizeResultSchema),
});
// POST /exports.create
const exportsCreateRequestSchema = z.object({
    orgId: orgIdSchema,
    type: z.enum(["csv", "qbo", "xero"]),
    params: z.unknown(),
});
const exportsCreateResponseSchema = z.object({
    exportId: exportIdSchema,
});
// Re-export all schemas for validation
export { orgCreateRequestSchema, orgCreateResponseSchema, connectionsListRequestSchema, connectionsListResponseSchema, connectionsCreateRequestSchema, connectionsCreateResponseSchema, transactionsListRequestSchema, transactionsListResponseSchema, categorizeRunRequestSchema, categorizeRunResponseSchema, exportsCreateRequestSchema, exportsCreateResponseSchema, connectionSchema, transactionSchema, categorizeResultSchema, };
//# sourceMappingURL=contracts.js.map