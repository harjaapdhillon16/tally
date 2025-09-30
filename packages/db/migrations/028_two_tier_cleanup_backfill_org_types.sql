-- 028_two_tier_cleanup_backfill_org_types.sql
-- Phase 4: Backfill type for org-specific categories based on name patterns
-- This fixes the UI "uncategorized" display issue by ensuring all categories have a type

-- ============================================================================
-- BACKFILL ORG-SPECIFIC CATEGORY TYPES BASED ON NAME PATTERNS
-- ============================================================================

DO $$
DECLARE
  v_updated_revenue INTEGER := 0;
  v_updated_cogs INTEGER := 0;
  v_updated_opex INTEGER := 0;
BEGIN
  -- Revenue patterns (services, sales, income)
  UPDATE categories
  SET type = 'revenue'
  WHERE org_id IS NOT NULL
    AND type IS NULL
    AND (
      name ILIKE '%revenue%'
      OR name ILIKE '%sales%'
      OR name ILIKE '%income%'
      OR name ILIKE '%service%'  -- Hair Services, Nail Services, etc.
      OR name ILIKE '%gift card%'
    );
  GET DIAGNOSTICS v_updated_revenue = ROW_COUNT;
  RAISE NOTICE 'Backfilled type=revenue for % org-specific categories', v_updated_revenue;
  
  -- COGS patterns (inventory, supplies, packaging, shipping to customers)
  UPDATE categories
  SET type = 'cogs'
  WHERE org_id IS NOT NULL
    AND type IS NULL
    AND (
      name ILIKE '%inventory%'
      OR name ILIKE '%supplies%'
      OR name ILIKE '%packaging%'
      OR name ILIKE '%shipping%'
      OR name ILIKE '%freight%'
      OR name ILIKE '%cost of goods%'
      OR name ILIKE '%cogs%'
    );
  GET DIAGNOSTICS v_updated_cogs = ROW_COUNT;
  RAISE NOTICE 'Backfilled type=cogs for % org-specific categories', v_updated_cogs;
  
  -- OpEx patterns (everything else that's an expense)
  UPDATE categories
  SET type = 'opex'
  WHERE org_id IS NOT NULL
    AND type IS NULL
    AND (
      name ILIKE '%expense%'
      OR name ILIKE '%fee%'
      OR name ILIKE '%rent%'
      OR name ILIKE '%utilities%'
      OR name ILIKE '%equipment%'
      OR name ILIKE '%maintenance%'
      OR name ILIKE '%wages%'
      OR name ILIKE '%staff%'
      OR name ILIKE '%payroll%'
      OR name ILIKE '%marketing%'
      OR name ILIKE '%advertising%'
      OR name ILIKE '%professional services%'
      OR name ILIKE '%insurance%'
      OR name ILIKE '%licenses%'
      OR name ILIKE '%permits%'
      OR name ILIKE '%training%'
      OR name ILIKE '%education%'
      OR name ILIKE '%software%'
      OR name ILIKE '%technology%'
      OR name ILIKE '%bank fee%'
      OR name ILIKE '%travel%'
      OR name ILIKE '%transportation%'
      OR name ILIKE '%office%'
      OR name ILIKE '%labor%'
    );
  GET DIAGNOSTICS v_updated_opex = ROW_COUNT;
  RAISE NOTICE 'Backfilled type=opex for % org-specific categories', v_updated_opex;
  
  -- Handle parent categories without specific patterns
  -- If parent_id is null and type is null, try to infer from name
  UPDATE categories
  SET type = CASE
    WHEN name ILIKE '%revenue%' THEN 'revenue'
    WHEN name ILIKE '%expense%' THEN 'opex'
    WHEN name ILIKE '%cogs%' OR name ILIKE '%cost of goods%' THEN 'cogs'
    ELSE 'opex'  -- Default to opex for generic "Expenses" parents
  END
  WHERE org_id IS NOT NULL
    AND parent_id IS NULL
    AND type IS NULL;
  
  RAISE NOTICE 'Backfilled types for org-specific parent categories';
  
  -- Report remaining NULL types
  DECLARE
    v_remaining_null INTEGER;
    v_rec RECORD;
  BEGIN
    SELECT COUNT(*) INTO v_remaining_null
    FROM categories
    WHERE org_id IS NOT NULL AND type IS NULL;
    
    IF v_remaining_null > 0 THEN
      RAISE WARNING 'Still have % org-specific categories with NULL type. Review manually.', v_remaining_null;
      
      -- Log them for review
      RAISE NOTICE 'Org-specific categories with NULL type:';
      FOR v_rec IN 
        SELECT id, org_id, name, parent_id
        FROM categories
        WHERE org_id IS NOT NULL AND type IS NULL
        LIMIT 10
      LOOP
        RAISE NOTICE '  - % (org: %, parent: %): %', v_rec.id, v_rec.org_id, v_rec.parent_id, v_rec.name;
      END LOOP;
    ELSE
      RAISE NOTICE 'SUCCESS: All org-specific categories now have a type!';
    END IF;
  END;
END $$;

-- ============================================================================
-- BACKFILL TYPE FOR GLOBAL ALLOWLIST CATEGORIES
-- ============================================================================

-- Ensure all global allowlist categories have correct types
UPDATE categories c
SET type = a.type
FROM categories_allowlist a
WHERE c.id = a.id
  AND c.org_id IS NULL
  AND (c.type IS NULL OR c.type != a.type);

-- Report summary
DO $$
DECLARE
  v_global_with_type INTEGER;
  v_global_without_type INTEGER;
  v_org_with_type INTEGER;
  v_org_without_type INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_global_with_type
  FROM categories WHERE org_id IS NULL AND type IS NOT NULL;
  
  SELECT COUNT(*) INTO v_global_without_type
  FROM categories WHERE org_id IS NULL AND type IS NULL;
  
  SELECT COUNT(*) INTO v_org_with_type
  FROM categories WHERE org_id IS NOT NULL AND type IS NOT NULL;
  
  SELECT COUNT(*) INTO v_org_without_type
  FROM categories WHERE org_id IS NOT NULL AND type IS NULL;
  
  RAISE NOTICE '=== TYPE BACKFILL SUMMARY ===';
  RAISE NOTICE 'Global categories with type: %', v_global_with_type;
  RAISE NOTICE 'Global categories without type: %', v_global_without_type;
  RAISE NOTICE 'Org-specific categories with type: %', v_org_with_type;
  RAISE NOTICE 'Org-specific categories without type: %', v_org_without_type;
END $$;

COMMENT ON COLUMN categories.type IS 'Updated in migration 028: Backfilled types for org-specific categories based on name patterns to fix UI rendering';
