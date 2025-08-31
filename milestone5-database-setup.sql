-- =========================================
-- MILESTONE 5 DATABASE SETUP - COMPLETE
-- =========================================
-- Run this entire script in Supabase SQL Editor to ensure your database
-- matches the expected Milestone 5 state
--
-- This script is idempotent - safe to run multiple times
-- Accounts for current database state and adds missing columns
-- =========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- MISSING TABLES FOR MILESTONE 5
-- =========================================

-- Create decisions table if it doesn't exist (for AI categorization tracking)
CREATE TABLE IF NOT EXISTS decisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    tx_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id uuid REFERENCES categories(id),
    confidence numeric,
    source text NOT NULL CHECK (source IN ('pass1', 'llm', 'manual')),
    rationale text[],
    llm_trace_id text, -- For Langfuse integration
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create corrections table if it doesn't exist (for tracking user corrections)
CREATE TABLE IF NOT EXISTS corrections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    tx_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    old_category_id uuid REFERENCES categories(id),
    new_category_id uuid NOT NULL REFERENCES categories(id),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- MISSING COLUMNS IN EXISTING TABLES
-- =========================================

-- Add missing columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS normalized_vendor text;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add missing columns to rules table  
ALTER TABLE rules 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- =========================================
-- RECEIPTS TABLE ENHANCEMENT
-- =========================================

-- Add missing columns to receipts table for M5 functionality
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id);

ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS original_filename text;

ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS file_type text;

ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS file_size integer;

ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS ocr_data jsonb;

ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create junction table for transaction-receipt relationships (M:N)
CREATE TABLE IF NOT EXISTS transaction_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    attached_by uuid NOT NULL REFERENCES auth.users(id),
    attached_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(transaction_id, receipt_id)
);

-- =========================================
-- PERFORMANCE INDEXES FOR REVIEW QUEUE
-- =========================================

-- Optimized index for review queue queries
-- Supports filtering by needs_review=true, org_id scoping, and ordering
CREATE INDEX IF NOT EXISTS tx_needs_review_idx 
ON transactions(org_id, needs_review, date DESC, confidence ASC NULLS LAST) 
WHERE needs_review = true;

-- Index for efficient category joins in review queries
CREATE INDEX IF NOT EXISTS categories_id_name_idx 
ON categories(id, name);

-- Optimize decisions lookup - get latest decision for a transaction
-- Supports efficient "Why?" popover functionality
CREATE INDEX IF NOT EXISTS decisions_tx_latest_idx 
ON decisions(tx_id, created_at DESC);

-- Optimize corrections tracking for analytics and audit
CREATE INDEX IF NOT EXISTS corrections_org_user_idx 
ON corrections(org_id, user_id, created_at DESC);

-- Create index on normalized vendor for efficient rule matching
CREATE INDEX IF NOT EXISTS transactions_normalized_vendor_idx 
ON transactions(org_id, normalized_vendor) 
WHERE normalized_vendor IS NOT NULL;

-- =========================================
-- VENDOR NORMALIZATION FUNCTION
-- =========================================

-- Function to normalize vendor names for consistent rule matching
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

-- =========================================
-- RULES TABLE OPTIMIZATION
-- =========================================

-- Unique index for vendor-based rules supporting atomic upserts
CREATE UNIQUE INDEX IF NOT EXISTS rules_vendor_mcc_unique 
ON rules(org_id, (pattern->>'vendor'), COALESCE(pattern->>'mcc', ''));

-- Drop old index if it exists
DROP INDEX IF EXISTS rules_vendor_sig_uniq;

-- =========================================
-- BULK CORRECTION FUNCTION
-- =========================================

-- Function for atomic bulk transaction corrections with rule generation
CREATE OR REPLACE FUNCTION bulk_correct_transactions(
  p_tx_ids uuid[],
  p_new_category_id uuid,
  p_org_id uuid,
  p_user_id uuid,
  p_create_rule boolean DEFAULT true
) RETURNS TABLE(
  corrected_count integer, 
  rule_signature text,
  rule_weight integer,
  errors jsonb
) AS $$
DECLARE
  tx_count integer := 0;
  vendor_name text;
  mcc_code text;
  normalized_vendor text;
  error_list jsonb := '[]'::jsonb;
  temp_tx record;
BEGIN
  -- Validate that all transactions belong to the organization
  FOR temp_tx IN 
    SELECT id, merchant_name, mcc, category_id 
    FROM transactions 
    WHERE id = ANY(p_tx_ids) AND org_id != p_org_id
  LOOP
    error_list := error_list || jsonb_build_object(
      'tx_id', temp_tx.id,
      'error', 'Transaction not found or access denied'
    );
  END LOOP;

  -- If there are access errors, return immediately
  IF jsonb_array_length(error_list) > 0 THEN
    RETURN QUERY SELECT 0, null::text, 0, error_list;
    RETURN;
  END IF;

  -- Update transactions atomically
  UPDATE transactions 
  SET 
    category_id = p_new_category_id,
    reviewed = true,
    needs_review = false,
    updated_at = now()
  WHERE 
    id = ANY(p_tx_ids) 
    AND org_id = p_org_id;
    
  GET DIAGNOSTICS tx_count = ROW_COUNT;
  
  -- Insert correction audit records for each transaction
  INSERT INTO corrections (org_id, tx_id, old_category_id, new_category_id, user_id)
  SELECT 
    p_org_id,
    t.id,
    t.category_id,
    p_new_category_id,
    p_user_id
  FROM transactions t
  WHERE t.id = ANY(p_tx_ids);
  
  -- Generate vendor rule from the most common vendor pattern if requested
  rule_signature := null;
  rule_weight := 0;
  
  IF p_create_rule AND tx_count > 0 THEN
    -- Find the most common vendor among the corrected transactions
    SELECT 
      t.merchant_name,
      t.mcc,
      normalize_vendor(t.merchant_name)
    INTO vendor_name, mcc_code, normalized_vendor
    FROM transactions t
    WHERE 
      t.id = ANY(p_tx_ids) 
      AND t.merchant_name IS NOT NULL
      AND normalize_vendor(t.merchant_name) IS NOT NULL
    GROUP BY t.merchant_name, t.mcc, normalize_vendor(t.merchant_name)
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Create or update the vendor rule if we found a valid pattern
    IF normalized_vendor IS NOT NULL THEN
      rule_signature := normalized_vendor || COALESCE('|' || mcc_code, '');
      
      -- Upsert rule with conflict resolution
      INSERT INTO rules (org_id, pattern, category_id, weight, created_at, updated_at)
      VALUES (
        p_org_id,
        jsonb_build_object(
          'vendor', normalized_vendor,
          'mcc', mcc_code
        ),
        p_new_category_id,
        tx_count,
        now(),
        now()
      )
      ON CONFLICT (org_id, (pattern->>'vendor'), COALESCE(pattern->>'mcc', ''))
      DO UPDATE SET 
        weight = rules.weight + tx_count,
        updated_at = now();
      
      -- Get the final weight
      SELECT weight INTO rule_weight
      FROM rules 
      WHERE 
        org_id = p_org_id 
        AND pattern->>'vendor' = normalized_vendor
        AND COALESCE(pattern->>'mcc', '') = COALESCE(mcc_code, '');
    END IF;
  END IF;
  
  RETURN QUERY SELECT tx_count, rule_signature, rule_weight, error_list;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- BACKGROUND NORMALIZATION FUNCTION
-- =========================================

-- Function to update normalized_vendor column for existing transactions
CREATE OR REPLACE FUNCTION update_normalized_vendors(p_batch_size integer DEFAULT 1000) 
RETURNS integer AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  UPDATE transactions 
  SET normalized_vendor = normalize_vendor(merchant_name)
  WHERE 
    normalized_vendor IS NULL 
    AND merchant_name IS NOT NULL
    AND normalize_vendor(merchant_name) IS NOT NULL
    AND id IN (
      SELECT id 
      FROM transactions 
      WHERE normalized_vendor IS NULL 
        AND merchant_name IS NOT NULL 
      LIMIT p_batch_size
    );
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- REVIEW QUEUE VIEW
-- =========================================

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

-- Enable security barrier for RLS
ALTER VIEW review_queue SET (security_barrier = true);

-- =========================================
-- ROW LEVEL SECURITY POLICIES
-- =========================================

-- Enable RLS on new tables
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for decisions table
DROP POLICY IF EXISTS "decisions_select_member" ON decisions;
CREATE POLICY "decisions_select_member" ON decisions
    FOR SELECT USING (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "decisions_insert_member" ON decisions;
CREATE POLICY "decisions_insert_member" ON decisions
    FOR INSERT WITH CHECK (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "decisions_update_member" ON decisions;
CREATE POLICY "decisions_update_member" ON decisions
    FOR UPDATE USING (public.user_in_org(org_id) = true);

-- RLS policies for corrections table
DROP POLICY IF EXISTS "corrections_select_member" ON corrections;
CREATE POLICY "corrections_select_member" ON corrections
    FOR SELECT USING (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "corrections_insert_member" ON corrections;
CREATE POLICY "corrections_insert_member" ON corrections
    FOR INSERT WITH CHECK (public.user_in_org(org_id) = true);

-- RLS policies for receipts table
DROP POLICY IF EXISTS "receipts_select_member" ON receipts;
CREATE POLICY "receipts_select_member" ON receipts
    FOR SELECT USING (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "receipts_insert_member" ON receipts;
CREATE POLICY "receipts_insert_member" ON receipts
    FOR INSERT WITH CHECK (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "receipts_update_member" ON receipts;
CREATE POLICY "receipts_update_member" ON receipts
    FOR UPDATE USING (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "receipts_delete_member" ON receipts;
CREATE POLICY "receipts_delete_member" ON receipts
    FOR DELETE USING (public.user_in_org(org_id) = true);

-- RLS policies for transaction_receipts table
DROP POLICY IF EXISTS "transaction_receipts_select_member" ON transaction_receipts;
CREATE POLICY "transaction_receipts_select_member" ON transaction_receipts
    FOR SELECT USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
        )
    );

DROP POLICY IF EXISTS "transaction_receipts_insert_member" ON transaction_receipts;
CREATE POLICY "transaction_receipts_insert_member" ON transaction_receipts
    FOR INSERT WITH CHECK (
        transaction_id IN (
            SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
        )
    );

DROP POLICY IF EXISTS "transaction_receipts_update_member" ON transaction_receipts;
CREATE POLICY "transaction_receipts_update_member" ON transaction_receipts
    FOR UPDATE USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
        )
    );

DROP POLICY IF EXISTS "transaction_receipts_delete_member" ON transaction_receipts;
CREATE POLICY "transaction_receipts_delete_member" ON transaction_receipts
    FOR DELETE USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
        )
    );

-- =========================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- =========================================

-- Performance indexes for new tables
CREATE INDEX IF NOT EXISTS decisions_org_id_idx ON decisions(org_id);
CREATE INDEX IF NOT EXISTS decisions_tx_id_idx ON decisions(tx_id);
CREATE INDEX IF NOT EXISTS decisions_created_at_idx ON decisions(created_at DESC);

CREATE INDEX IF NOT EXISTS corrections_tx_id_idx ON corrections(tx_id);
CREATE INDEX IF NOT EXISTS corrections_created_at_idx ON corrections(created_at DESC);

-- Performance indexes for receipts functionality
CREATE INDEX IF NOT EXISTS receipts_org_id_idx ON receipts(org_id);
CREATE INDEX IF NOT EXISTS receipts_uploaded_by_idx ON receipts(uploaded_by);
CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS receipts_processing_status_idx ON receipts(processing_status) 
    WHERE processing_status != 'completed';

-- Indexes for transaction_receipts junction table
CREATE INDEX IF NOT EXISTS transaction_receipts_tx_idx ON transaction_receipts(transaction_id);
CREATE INDEX IF NOT EXISTS transaction_receipts_receipt_idx ON transaction_receipts(receipt_id);
CREATE INDEX IF NOT EXISTS transaction_receipts_attached_by_idx ON transaction_receipts(attached_by);

-- =========================================
-- DATA POPULATION AND NORMALIZATION
-- =========================================

-- Update existing transactions to have needs_review populated
UPDATE transactions 
SET needs_review = true 
WHERE needs_review IS NULL 
  AND (category_id IS NULL OR confidence IS NULL OR confidence < 0.8);

-- Populate normalized_vendor for existing transactions (run in small batches)
UPDATE transactions 
SET normalized_vendor = normalize_vendor(merchant_name)
WHERE normalized_vendor IS NULL 
  AND merchant_name IS NOT NULL
  AND id IN (
    SELECT id FROM transactions 
    WHERE normalized_vendor IS NULL 
      AND merchant_name IS NOT NULL 
    LIMIT 1000
  );

-- =========================================
-- HELPFUL COMMENTS
-- =========================================

COMMENT ON INDEX tx_needs_review_idx IS 
'Optimized index for review queue queries. Supports filtering by needs_review=true, org_id scoping, and ordering by date DESC, confidence ASC for prioritizing low-confidence transactions.';

COMMENT ON FUNCTION normalize_vendor(text) IS 
'Normalizes vendor names for consistent rule matching by removing common business suffixes, special characters, and standardizing case/spacing.';

COMMENT ON VIEW review_queue IS 
'Materialized view for efficient review queue queries. Pre-joins transactions, categories, and latest decisions to minimize query complexity in the application layer.';

COMMENT ON FUNCTION bulk_correct_transactions(uuid[], uuid, uuid, uuid, boolean) IS 
'Atomically corrects multiple transactions and optionally creates/updates vendor rules. Returns correction count, rule signature, and any errors encountered.';

COMMENT ON FUNCTION update_normalized_vendors(integer) IS 
'Background job function to populate normalized_vendor column for improved rule matching performance. Processes transactions in batches to avoid long-running transactions.';

COMMENT ON TABLE decisions IS 
'AI categorization decisions with confidence scores and rationale for "Why?" popover functionality.';

COMMENT ON TABLE corrections IS 
'Audit trail of user corrections to AI categorization decisions for analytics and rule generation.';

COMMENT ON TABLE receipts IS 
'Receipt storage and OCR data. Enhanced for M5 stub functionality and M6 full OCR implementation.';

COMMENT ON TABLE transaction_receipts IS 
'Junction table for M:N relationship between transactions and receipts. Allows multiple receipts per transaction.';

COMMENT ON COLUMN receipts.ocr_data IS 
'OCR results in JSONB format for AI processing in future milestones.';

COMMENT ON COLUMN receipts.processing_status IS 
'Receipt processing status: pending (uploaded), processing (OCR in progress), completed (OCR done), failed (OCR error).';

COMMENT ON COLUMN transactions.needs_review IS 
'Flag indicating if transaction requires human review. Set to true for low confidence or uncategorized transactions.';

COMMENT ON COLUMN transactions.normalized_vendor IS 
'Normalized merchant name for efficient rule matching. Populated by normalize_vendor() function.';

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Run these to verify the setup worked correctly:

-- 1. Check that all required columns exist in transactions
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'transactions' 
-- AND column_name IN ('needs_review', 'normalized_vendor', 'updated_at')
-- ORDER BY column_name;

-- 2. Check that decisions and corrections tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('decisions', 'corrections') 
-- ORDER BY table_name;

-- 3. Check that receipts table has all required columns
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'receipts' 
-- AND column_name IN ('uploaded_by', 'original_filename', 'file_type', 'file_size', 'processing_status', 'ocr_data', 'updated_at')
-- ORDER BY column_name;

-- 4. Check that all indexes exist
-- SELECT schemaname, tablename, indexname FROM pg_indexes 
-- WHERE tablename IN ('transactions', 'receipts', 'transaction_receipts', 'rules', 'decisions', 'corrections')
-- AND indexname LIKE '%_idx' OR indexname LIKE '%_unique'
-- ORDER BY tablename, indexname;

-- 5. Check that all functions exist
-- SELECT routine_name, routine_type FROM information_schema.routines 
-- WHERE routine_name IN ('normalize_vendor', 'bulk_correct_transactions', 'update_normalized_vendors')
-- ORDER BY routine_name;

-- 6. Check that the review_queue view exists and works
-- SELECT table_name FROM information_schema.views WHERE table_name = 'review_queue';
-- SELECT COUNT(*) as review_queue_count FROM review_queue;

-- =========================================
-- SETUP COMPLETE
-- =========================================
-- Your database is now ready for Milestone 5 functionality!
-- 
-- The script has:
-- ✅ Added missing tables (decisions, corrections)
-- ✅ Added missing columns to existing tables
-- ✅ Enhanced receipts table for M5 functionality
-- ✅ Created all necessary indexes for performance
-- ✅ Set up RLS policies for security
-- ✅ Added functions for bulk operations
-- ✅ Created the review_queue view
-- ✅ Populated initial data where appropriate
-- 
-- Next steps:
-- 1. Run the verification queries above to confirm success
-- 2. Deploy Edge Functions with proper secrets
-- 3. Test the review queue API
-- 4. Test transaction correction workflow
-- 5. Test receipt upload functionality
-- =========================================