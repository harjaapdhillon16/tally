-- Migration: Invert transaction amounts to use accounting convention
-- Purpose: Convert from Plaid convention (positive=expense, negative=income) 
--          to accounting convention (negative=expense, positive=income)
-- Date: 2025-10-16

-- Safety: Create backup table
CREATE TABLE IF NOT EXISTS transactions_backup_20251016 AS 
SELECT * FROM transactions;

-- Invert all amount_cents values
-- Multiply by -1 to convert Plaid convention to accounting convention
UPDATE transactions 
SET amount_cents = amount_cents * -1
WHERE amount_cents IS NOT NULL;

-- Verification query (run this after migration to verify correctness)
-- Expected: opex/cogs/liability should have negative avg, revenue should have positive avg
-- 
-- SELECT 
--   c.type,
--   COUNT(*) as transaction_count,
--   ROUND(AVG((t.amount_cents::bigint / 100.0)), 2) as avg_dollars,
--   CASE 
--     WHEN c.type IN ('opex', 'cogs', 'liability') AND AVG(t.amount_cents::bigint) < 0 THEN '✅ Correct (negative)'
--     WHEN c.type = 'revenue' AND AVG(t.amount_cents::bigint) > 0 THEN '✅ Correct (positive)'
--     WHEN c.type = 'clearing' THEN '⚠️  Clearing (can be either)'
--     ELSE '❌ Wrong sign'
--   END as validation
-- FROM transactions t
-- LEFT JOIN categories c ON t.category_id = c.id
-- GROUP BY c.type
-- ORDER BY c.type;

