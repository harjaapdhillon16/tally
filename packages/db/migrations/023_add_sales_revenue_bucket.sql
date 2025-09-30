-- 023_add_sales_revenue_bucket.sql
-- Adds Sales Revenue Tier 2 bucket and remaps DTC Sales transactions
-- Completes the Revenue taxonomy with a proper bucket for general sales

-- Step 1: Create the new Sales Revenue category
INSERT INTO categories (id, org_id, name, parent_id, type, is_active, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440106', -- Deterministic UUID
  NULL,                                     -- Global category
  'Sales Revenue',                          -- Display name
  '550e8400-e29b-41d4-a716-446655440100', -- Revenue parent
  'revenue',                                -- Type
  true,                                     -- Active
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Remap all DTC Sales transactions to Sales Revenue
UPDATE transactions
SET category_id = '550e8400-e29b-41d4-a716-446655440106' -- Sales Revenue
WHERE category_id = '550e8400-e29b-41d4-a716-446655440101'; -- DTC Sales (inactive)

-- Step 3: Remap any decisions referencing DTC Sales
UPDATE decisions
SET category_id = '550e8400-e29b-41d4-a716-446655440106' -- Sales Revenue
WHERE category_id = '550e8400-e29b-41d4-a716-446655440101'; -- DTC Sales (inactive)

-- Step 4: Remap any corrections referencing DTC Sales (old_category_id)
UPDATE corrections
SET old_category_id = '550e8400-e29b-41d4-a716-446655440106' -- Sales Revenue
WHERE old_category_id = '550e8400-e29b-41d4-a716-446655440101'; -- DTC Sales (inactive)

-- Step 5: Remap any corrections referencing DTC Sales (new_category_id)
UPDATE corrections
SET new_category_id = '550e8400-e29b-41d4-a716-446655440106' -- Sales Revenue
WHERE new_category_id = '550e8400-e29b-41d4-a716-446655440101'; -- DTC Sales (inactive)

-- Step 6: Remap any rules referencing DTC Sales
UPDATE rules
SET category_id = '550e8400-e29b-41d4-a716-446655440106' -- Sales Revenue
WHERE category_id = '550e8400-e29b-41d4-a716-446655440101'; -- DTC Sales (inactive)

-- ============================================================================
-- VERIFICATION QUERIES (uncomment to run manually after migration)
-- ============================================================================

-- Check new category exists
-- SELECT id, name, parent_id, type, is_active 
-- FROM categories 
-- WHERE id = '550e8400-e29b-41d4-a716-446655440106';
-- Expected: 1 row with Sales Revenue

-- Check transactions were remapped
-- SELECT COUNT(*) as remapped_count
-- FROM transactions 
-- WHERE category_id = '550e8400-e29b-41d4-a716-446655440106';
-- Expected: 157 (or the count from the original DTC Sales transactions)

-- Check no transactions still reference DTC Sales (inactive)
-- SELECT COUNT(*) as orphaned_count
-- FROM transactions 
-- WHERE category_id = '550e8400-e29b-41d4-a716-446655440101';
-- Expected: 0

-- Check all Revenue Tier 2 buckets
-- SELECT id, name, parent_id, is_active
-- FROM categories
-- WHERE parent_id = '550e8400-e29b-41d4-a716-446655440100' -- Revenue parent
--   AND is_active = true
-- ORDER BY name;
-- Expected: 3 rows (Sales Revenue, Shipping Income, Refunds)

-- Add comment for documentation
COMMENT ON TABLE categories IS 'Updated in migration 023: Added Sales Revenue Tier 2 bucket and remapped DTC Sales transactions';
