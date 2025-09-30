-- 029_two_tier_cleanup_delete_legacy.sql
-- Phase 5: Hard delete ONLY global legacy categories (not in allowlist)
-- Preserves ALL org-specific categories for future vertical flexibility

-- Safety check: ensure no remaining references
DO $$
DECLARE
  v_orphaned_count INTEGER;
BEGIN
  -- Check for any remaining references to non-allowlist global categories
  SELECT COUNT(*) INTO v_orphaned_count
  FROM (
    SELECT t.category_id FROM transactions t
    JOIN categories c ON t.category_id = c.id
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL AND a.id IS NULL
    
    UNION ALL
    
    SELECT d.category_id FROM decisions d
    JOIN categories c ON d.category_id = c.id
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL AND a.id IS NULL
    
    UNION ALL
    
    SELECT cor.old_category_id FROM corrections cor
    JOIN categories c ON cor.old_category_id = c.id
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL AND a.id IS NULL
    
    UNION ALL
    
    SELECT cor.new_category_id FROM corrections cor
    JOIN categories c ON cor.new_category_id = c.id
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL AND a.id IS NULL
    
    UNION ALL
    
    SELECT r.category_id FROM rules r
    JOIN categories c ON r.category_id = c.id
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL AND a.id IS NULL
  ) orphans;
  
  IF v_orphaned_count > 0 THEN
    RAISE EXCEPTION 'ABORT: Found % references to non-allowlist global categories. Run migration 027 first.', v_orphaned_count;
  END IF;
  
  RAISE NOTICE 'SAFETY CHECK PASSED: No orphaned references found.';
END $$;

-- ============================================================================
-- DELETE GLOBAL LEGACY CATEGORIES (NOT IN ALLOWLIST)
-- ============================================================================

DO $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_categories_to_delete CURSOR FOR
    SELECT c.id, c.name, c.parent_id, c.is_active
    FROM categories c
    LEFT JOIN categories_allowlist a ON c.id = a.id
    WHERE c.org_id IS NULL  -- Only global categories
      AND a.id IS NULL      -- Not in allowlist
    ORDER BY c.created_at;
  v_rec RECORD;
BEGIN
  RAISE NOTICE 'Starting deletion of global legacy categories...';
  
  -- List categories to be deleted (for audit)
  FOR v_rec IN v_categories_to_delete LOOP
    RAISE NOTICE 'Deleting: % (id: %, parent: %, is_active: %)', 
      v_rec.name, v_rec.id, v_rec.parent_id, v_rec.is_active;
  END LOOP;
  
  -- Perform deletion
  DELETE FROM categories
  WHERE org_id IS NULL
    AND id NOT IN (SELECT id FROM categories_allowlist);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE '=== DELETION COMPLETE ===';
  RAISE NOTICE 'Deleted % global legacy categories', v_deleted_count;
END $$;

-- ============================================================================
-- VERIFICATION: Ensure only allowlist + org-specific categories remain
-- ============================================================================

DO $$
DECLARE
  v_global_count INTEGER;
  v_allowlist_count INTEGER;
  v_org_count INTEGER;
  v_unexpected_global INTEGER;
BEGIN
  -- Count global categories
  SELECT COUNT(*) INTO v_global_count
  FROM categories WHERE org_id IS NULL;
  
  -- Count allowlist
  SELECT COUNT(*) INTO v_allowlist_count
  FROM categories_allowlist;
  
  -- Count org-specific
  SELECT COUNT(*) INTO v_org_count
  FROM categories WHERE org_id IS NOT NULL;
  
  -- Check for unexpected global categories
  SELECT COUNT(*) INTO v_unexpected_global
  FROM categories c
  LEFT JOIN categories_allowlist a ON c.id = a.id
  WHERE c.org_id IS NULL AND a.id IS NULL;
  
  RAISE NOTICE '=== FINAL CATEGORY COUNTS ===';
  RAISE NOTICE 'Global categories: % (expected: %)', v_global_count, v_allowlist_count;
  RAISE NOTICE 'Org-specific categories: %', v_org_count;
  RAISE NOTICE 'Unexpected global categories: %', v_unexpected_global;
  
  IF v_global_count = v_allowlist_count AND v_unexpected_global = 0 THEN
    RAISE NOTICE 'SUCCESS: Only allowlist global categories remain!';
  ELSE
    RAISE WARNING 'MISMATCH: Expected % global categories, found %', v_allowlist_count, v_global_count;
  END IF;
END $$;

-- ============================================================================
-- FINAL REPORT: Show remaining categories by type
-- ============================================================================

DO $$
DECLARE
  v_rec RECORD;
BEGIN
  RAISE NOTICE '=== REMAINING CATEGORIES BY TYPE ===';
  
  FOR v_rec IN
    SELECT 
      COALESCE(type, 'NULL') as category_type,
      CASE WHEN org_id IS NULL THEN 'Global' ELSE 'Org-Specific' END as scope,
      COUNT(*) as count
    FROM categories
    GROUP BY type, (org_id IS NULL)
    ORDER BY scope, category_type
  LOOP
    RAISE NOTICE '% - %: % categories', v_rec.scope, v_rec.category_type, v_rec.count;
  END LOOP;
END $$;

COMMENT ON TABLE categories IS 'Updated in migration 029: Removed global legacy categories; only allowlist + org-specific categories remain';
