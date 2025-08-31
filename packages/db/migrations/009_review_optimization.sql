-- 009_review_optimization.sql - Performance indexes and optimizations for review queue
-- Implements Phase 1 of Milestone 5: Database optimizations

-- Performance indexes for review queue
-- Optimized for filtering by needs_review, org_id, and ordering by date/confidence
CREATE INDEX IF NOT EXISTS tx_needs_review_idx 
ON transactions(org_id, needs_review, date DESC, confidence ASC NULLS LAST) 
WHERE needs_review = true;

-- Prevent duplicate rules and enable efficient lookups
-- This index supports vendor-based rule matching during categorization
CREATE UNIQUE INDEX IF NOT EXISTS rules_vendor_sig_uniq 
ON rules(org_id, (pattern->>'vendor'), (pattern->>'mcc')) 
WHERE pattern ? 'vendor';

-- Optimize decisions lookup - get latest decision for a transaction
-- Supports efficient "Why?" popover functionality
CREATE INDEX IF NOT EXISTS decisions_tx_latest_idx 
ON decisions(tx_id, created_at DESC);

-- Optimize corrections tracking for analytics and audit
-- Supports user activity tracking and correction patterns
CREATE INDEX IF NOT EXISTS corrections_org_user_idx 
ON corrections(org_id, user_id, created_at DESC);

-- Add index for efficient category joins in review queries
-- Improves performance when fetching transaction + category name
CREATE INDEX IF NOT EXISTS categories_id_name_idx 
ON categories(id, name);

-- Add vendor normalization function for consistent rule matching
-- This function will be used by the categorization engine and bulk operations
CREATE OR REPLACE FUNCTION normalize_vendor(vendor text) 
RETURNS text AS $$
BEGIN
  IF vendor IS NULL OR trim(vendor) = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(vendor), 
          '\b(llc|inc|corp|ltd|co|company)\b\.?', '', 'g'
        ),
        '[^\w\s]', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add computed column for normalized vendor names to improve rule matching performance
-- This will be populated by triggers or background jobs in future migrations
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS normalized_vendor text;

-- Create index on normalized vendor for efficient rule matching
CREATE INDEX IF NOT EXISTS transactions_normalized_vendor_idx 
ON transactions(org_id, normalized_vendor) 
WHERE normalized_vendor IS NOT NULL;

-- Create a view for efficient review queue queries
-- This materializes the complex join logic for better performance
CREATE OR REPLACE VIEW review_queue AS
SELECT 
  t.id,
  t.org_id,
  t.date,
  t.merchant_name,
  t.description,
  t.amount_cents,
  t.currency,
  t.category_id,
  t.confidence,
  t.needs_review,
  c.name as category_name,
  d.rationale,
  d.source as decision_source,
  d.confidence as decision_confidence,
  d.created_at as decision_created_at
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN LATERAL (
  SELECT rationale, source, confidence, created_at
  FROM decisions 
  WHERE tx_id = t.id 
  ORDER BY created_at DESC 
  LIMIT 1
) d ON true
WHERE t.needs_review = true;

-- Grant access to the view for authenticated users
GRANT SELECT ON review_queue TO authenticated;

-- Add RLS policy for the view
ALTER VIEW review_queue SET (security_barrier = true);

-- Add comment explaining the optimization strategy
COMMENT ON INDEX tx_needs_review_idx IS 
'Optimized index for review queue queries. Supports filtering by needs_review=true, org_id scoping, and ordering by date DESC, confidence ASC for prioritizing low-confidence transactions.';

COMMENT ON FUNCTION normalize_vendor(text) IS 
'Normalizes vendor names for consistent rule matching by removing common business suffixes, special characters, and standardizing case/spacing.';

COMMENT ON VIEW review_queue IS 
'Materialized view for efficient review queue queries. Pre-joins transactions, categories, and latest decisions to minimize query complexity in the application layer.';

-- Add receipts table for M5 stub (full OCR implementation in M6)
CREATE TABLE IF NOT EXISTS receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    uploaded_by uuid NOT NULL REFERENCES auth.users(id),
    storage_path text NOT NULL,
    original_filename text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    ocr_data jsonb, -- For future OCR results
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add receipts to transactions junction table for attachment
CREATE TABLE IF NOT EXISTS transaction_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    attached_by uuid NOT NULL REFERENCES auth.users(id),
    attached_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(transaction_id, receipt_id)
);

-- Enable RLS on receipts tables
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;

-- Add indexes for receipts
CREATE INDEX IF NOT EXISTS receipts_org_id_idx ON receipts(org_id);
CREATE INDEX IF NOT EXISTS receipts_uploaded_by_idx ON receipts(uploaded_by);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS transaction_receipts_tx_idx ON transaction_receipts(transaction_id);
CREATE INDEX IF NOT EXISTS transaction_receipts_receipt_idx ON transaction_receipts(receipt_id);