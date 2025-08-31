-- 010_bulk_functions.sql - Database functions for bulk operations
-- Implements Phase 8 performance optimizations for atomic bulk corrections

-- Bulk correction function for atomic transaction updates
-- This function ensures data consistency and generates vendor rules from bulk corrections
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

-- Function to update normalized_vendor column for existing transactions
-- This can be run as a background job to improve rule matching performance
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

-- Create an index on the rules table to support the ON CONFLICT clause
-- This prevents the unique constraint violation during concurrent rule updates
CREATE UNIQUE INDEX IF NOT EXISTS rules_vendor_mcc_unique 
ON rules(org_id, (pattern->>'vendor'), COALESCE(pattern->>'mcc', ''));

-- Drop the old index if it exists (from previous migration)
DROP INDEX IF EXISTS rules_vendor_sig_uniq;

-- Add helpful comments
COMMENT ON FUNCTION bulk_correct_transactions(uuid[], uuid, uuid, uuid, boolean) IS 
'Atomically corrects multiple transactions and optionally creates/updates vendor rules. Returns correction count, rule signature, and any errors encountered.';

COMMENT ON FUNCTION update_normalized_vendors(integer) IS 
'Background job function to populate normalized_vendor column for improved rule matching performance. Processes transactions in batches to avoid long-running transactions.';

COMMENT ON INDEX rules_vendor_mcc_unique IS 
'Unique constraint for vendor-based rules supporting atomic upserts during bulk corrections.';