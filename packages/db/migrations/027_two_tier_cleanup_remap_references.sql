-- 027_two_tier_cleanup_remap_references.sql
-- Phase 3: Remap all references to non-allowlist GLOBAL categories
-- Preserves org-specific categories for future vertical flexibility

-- Safety check: ensure allowlist and remap tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories_allowlist') THEN
    RAISE EXCEPTION 'categories_allowlist table does not exist. Run migration 025 first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'category_remap') THEN
    RAISE EXCEPTION 'category_remap table does not exist. Run migration 026 first.';
  END IF;
END $$;

-- ============================================================================
-- REMAP TRANSACTIONS
-- ============================================================================

-- Update transactions that reference legacy global categories (org_id IS NULL and not in allowlist)
-- Process in chunks to avoid long locks
DO $$
DECLARE
  v_updated_count INTEGER := 0;
  v_batch_size INTEGER := 1000;
  v_total INTEGER;
BEGIN
  -- Count total rows to update
  SELECT COUNT(*) INTO v_total
  FROM transactions t
  WHERE t.category_id IN (
    SELECT c.id 
    FROM categories c
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL  -- Only global categories
      AND a.id IS NULL      -- Not in allowlist
  );
  
  RAISE NOTICE 'Found % transactions to remap', v_total;
  
  -- Update in batches
  WHILE v_updated_count < v_total LOOP
    UPDATE transactions
    SET category_id = r.target_id,
        updated_at = now()
    FROM category_remap r
    WHERE transactions.category_id = r.source_id
      AND transactions.id IN (
        SELECT t2.id
        FROM transactions t2
        WHERE t2.category_id = r.source_id
        LIMIT v_batch_size
      );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Remapped % transactions so far', v_updated_count;
    
    -- Small delay to allow other operations
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RAISE NOTICE 'Completed remapping % transactions', v_total;
END $$;

-- ============================================================================
-- REMAP DECISIONS
-- ============================================================================

DO $$
DECLARE
  v_updated_count INTEGER := 0;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM decisions d
  WHERE d.category_id IN (
    SELECT c.id 
    FROM categories c
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL AND a.id IS NULL
  );
  
  RAISE NOTICE 'Found % decisions to remap', v_total;
  
  UPDATE decisions
  SET category_id = r.target_id
  FROM category_remap r
  WHERE decisions.category_id = r.source_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Remapped % decisions', v_updated_count;
END $$;

-- ============================================================================
-- REMAP CORRECTIONS (both old_category_id and new_category_id)
-- ============================================================================

DO $$
DECLARE
  v_updated_old INTEGER := 0;
  v_updated_new INTEGER := 0;
BEGIN
  -- Remap old_category_id
  UPDATE corrections
  SET old_category_id = r.target_id
  FROM category_remap r
  WHERE corrections.old_category_id = r.source_id;
  
  GET DIAGNOSTICS v_updated_old = ROW_COUNT;
  RAISE NOTICE 'Remapped % corrections.old_category_id', v_updated_old;
  
  -- Remap new_category_id
  UPDATE corrections
  SET new_category_id = r.target_id
  FROM category_remap r
  WHERE corrections.new_category_id = r.source_id;
  
  GET DIAGNOSTICS v_updated_new = ROW_COUNT;
  RAISE NOTICE 'Remapped % corrections.new_category_id', v_updated_new;
END $$;

-- ============================================================================
-- REMAP RULES
-- ============================================================================

DO $$
DECLARE
  v_updated_count INTEGER := 0;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM rules r
  WHERE r.category_id IN (
    SELECT c.id 
    FROM categories c
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL AND a.id IS NULL
  );
  
  RAISE NOTICE 'Found % rules to remap', v_total;
  
  UPDATE rules
  SET category_id = r.target_id,
      updated_at = now()
  FROM category_remap r
  WHERE rules.category_id = r.source_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Remapped % rules', v_updated_count;
END $$;

-- ============================================================================
-- VERIFICATION: Check for remaining references to non-allowlist global categories
-- ============================================================================

DO $$
DECLARE
  v_orphaned_transactions INTEGER;
  v_orphaned_decisions INTEGER;
  v_orphaned_corrections INTEGER;
  v_orphaned_rules INTEGER;
BEGIN
  -- Check transactions
  SELECT COUNT(*) INTO v_orphaned_transactions
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  LEFT JOIN categories_allowlist a ON c.id = a.id
  WHERE c.org_id IS NULL AND a.id IS NULL;
  
  -- Check decisions
  SELECT COUNT(*) INTO v_orphaned_decisions
  FROM decisions d
  JOIN categories c ON d.category_id = c.id
  LEFT JOIN categories_allowlist a ON c.id = a.id
  WHERE c.org_id IS NULL AND a.id IS NULL;
  
  -- Check corrections (old_category_id)
  SELECT COUNT(*) INTO v_orphaned_corrections
  FROM corrections cor
  JOIN categories c ON cor.old_category_id = c.id OR cor.new_category_id = c.id
  LEFT JOIN categories_allowlist a ON c.id = a.id
  WHERE c.org_id IS NULL AND a.id IS NULL;
  
  -- Check rules
  SELECT COUNT(*) INTO v_orphaned_rules
  FROM rules r
  JOIN categories c ON r.category_id = c.id
  LEFT JOIN categories_allowlist a ON c.id = a.id
  WHERE c.org_id IS NULL AND a.id IS NULL;
  
  -- Report results
  IF v_orphaned_transactions > 0 THEN
    RAISE WARNING 'Still have % transactions referencing non-allowlist global categories', v_orphaned_transactions;
  END IF;
  
  IF v_orphaned_decisions > 0 THEN
    RAISE WARNING 'Still have % decisions referencing non-allowlist global categories', v_orphaned_decisions;
  END IF;
  
  IF v_orphaned_corrections > 0 THEN
    RAISE WARNING 'Still have % corrections referencing non-allowlist global categories', v_orphaned_corrections;
  END IF;
  
  IF v_orphaned_rules > 0 THEN
    RAISE WARNING 'Still have % rules referencing non-allowlist global categories', v_orphaned_rules;
  END IF;
  
  IF v_orphaned_transactions = 0 AND v_orphaned_decisions = 0 AND v_orphaned_corrections = 0 AND v_orphaned_rules = 0 THEN
    RAISE NOTICE 'SUCCESS: All references to non-allowlist global categories have been remapped!';
  ELSE
    RAISE EXCEPTION 'FAILED: Still have orphaned references. Cannot proceed to deletion.';
  END IF;
END $$;

COMMENT ON COLUMN transactions.category_id IS 'Updated in migration 027: Remapped legacy global categories to two-tier taxonomy';
COMMENT ON COLUMN decisions.category_id IS 'Updated in migration 027: Remapped legacy global categories to two-tier taxonomy';
COMMENT ON COLUMN corrections.old_category_id IS 'Updated in migration 027: Remapped legacy global categories to two-tier taxonomy';
COMMENT ON COLUMN corrections.new_category_id IS 'Updated in migration 027: Remapped legacy global categories to two-tier taxonomy';
COMMENT ON COLUMN rules.category_id IS 'Updated in migration 027: Remapped legacy global categories to two-tier taxonomy';
