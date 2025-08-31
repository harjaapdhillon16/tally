import { z } from "zod";
import { transactionIdSchema, categoryIdSchema } from "./contracts.js";

// Review API schemas and types

// Review list request with cursor pagination and filtering
export const reviewListRequestSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  filter: z.object({
    needsReviewOnly: z.boolean().optional().default(true),
    minConfidence: z.number().min(0).max(1).optional().default(0),
    maxConfidence: z.number().min(0).max(1).optional().default(1),
  }).optional().default(() => ({
    needsReviewOnly: true,
    minConfidence: 0,
    maxConfidence: 1,
  })),
});

// Individual transaction item in review list
export const reviewTransactionItemSchema = z.object({
  id: transactionIdSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchant_name: z.string().nullable(),
  description: z.string(),
  amount_cents: z.string(), // Keep as string for exact decimal arithmetic
  currency: z.string().length(3).default("USD"),
  category_id: categoryIdSchema.nullable(),
  category_name: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  needs_review: z.boolean(),
  why: z.array(z.string()).max(3), // Top 2-3 rationale strings for display
  decision_source: z.enum(["pass1", "llm"]).nullable(),
  decision_created_at: z.string().datetime().nullable(),
});

// Review list response with cursor pagination
export const reviewListResponseSchema = z.object({
  items: z.array(reviewTransactionItemSchema),
  nextCursor: z.string().optional(),
  totalCount: z.number().int().nonnegative().optional(),
  hasMore: z.boolean(),
});

// Bulk correction request
export const transactionBulkCorrectRequestSchema = z.object({
  tx_ids: z.array(transactionIdSchema).min(1).max(100), // Limit bulk operations
  new_category_id: categoryIdSchema,
  create_rule: z.boolean().optional().default(true), // Whether to create/update vendor rule
});

// Bulk correction response
export const transactionBulkCorrectResponseSchema = z.object({
  success: z.boolean(),
  corrected_count: z.number().int().nonnegative(),
  rule_signature: z.string().optional(),
  message: z.string(),
  errors: z.array(z.object({
    tx_id: transactionIdSchema,
    error: z.string(),
  })).optional(),
});

// Rule upsert request for vendor-based rules
export const ruleUpsertRequestSchema = z.object({
  vendor: z.string().min(1),
  mcc: z.string().optional(),
  category_id: categoryIdSchema,
  description: z.string().optional(),
  weight: z.number().int().min(1).optional().default(1),
});

// Rule upsert response
export const ruleUpsertResponseSchema = z.object({
  success: z.boolean(),
  rule_id: z.string().uuid(),
  message: z.string(),
  is_new: z.boolean(), // Whether rule was created (true) or updated (false)
});

// Review filters for UI state management
export const reviewFiltersSchema = z.object({
  needsReviewOnly: z.boolean().default(true),
  minConfidence: z.number().min(0).max(1).default(0),
  maxConfidence: z.number().min(0).max(1).default(1),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryIds: z.array(categoryIdSchema).optional(),
  searchQuery: z.string().optional(),
});

// Receipt attachment request (stub for M6)
export const receiptAttachRequestSchema = z.object({
  tx_id: transactionIdSchema,
  file_type: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  file_size: z.number().int().min(1).max(10 * 1024 * 1024), // Max 10MB
});

// Receipt attachment response
export const receiptAttachResponseSchema = z.object({
  success: z.boolean(),
  receipt_id: z.string().uuid(),
  storage_url: z.string().url(),
  message: z.string(),
});

// Decision rationale display format
export const decisionRationaleSchema = z.object({
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).max(5),
  source: z.enum(["pass1", "llm"]),
  source_detail: z.string().optional(), // e.g., "MCC 1234, vendor pattern"
  created_at: z.string().datetime(),
});

// Keyboard navigation state for table virtualization
export const keyboardNavigationStateSchema = z.object({
  selectedIndex: z.number().int().nonnegative().default(0),
  editingIndex: z.number().int().nonnegative().optional(),
  selectionMode: z.enum(["single", "multi"]).default("single"),
});

// Bulk action types for the floating action bar
export const bulkActionSchema = z.object({
  type: z.enum(["accept", "categorize", "attach_receipts", "clear_selection"]),
  category_id: categoryIdSchema.optional(),
  create_rule: z.boolean().optional().default(true),
});

// Export all inferred types
export type ReviewListRequest = z.infer<typeof reviewListRequestSchema>;
export type ReviewTransactionItem = z.infer<typeof reviewTransactionItemSchema>;
export type ReviewListResponse = z.infer<typeof reviewListResponseSchema>;
export type TransactionBulkCorrectRequest = z.infer<typeof transactionBulkCorrectRequestSchema>;
export type TransactionBulkCorrectResponse = z.infer<typeof transactionBulkCorrectResponseSchema>;
export type RuleUpsertRequest = z.infer<typeof ruleUpsertRequestSchema>;
export type RuleUpsertResponse = z.infer<typeof ruleUpsertResponseSchema>;
export type ReviewFilters = z.infer<typeof reviewFiltersSchema>;
export type ReceiptAttachRequest = z.infer<typeof receiptAttachRequestSchema>;
export type ReceiptAttachResponse = z.infer<typeof receiptAttachResponseSchema>;
export type DecisionRationale = z.infer<typeof decisionRationaleSchema>;
export type KeyboardNavigationState = z.infer<typeof keyboardNavigationStateSchema>;
export type BulkAction = z.infer<typeof bulkActionSchema>;

// Schemas are already exported above as const assertions