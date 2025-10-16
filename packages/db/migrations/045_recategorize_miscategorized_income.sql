-- Migration: Recategorize miscategorized income transactions
-- Purpose: Clear categorizations for income (positive amount) transactions
--          that were incorrectly categorized as expenses
-- Date: 2025-10-16

-- Identify and clear miscategorized income transactions
-- These are transactions with positive amounts (income) that were categorized as expenses
WITH miscategorized AS (
  SELECT 
    t.id,
    t.description,
    t.amount_cents,
    c.slug as current_category,
    c.type as current_type
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  WHERE t.amount_cents > 0  -- Positive = income in accounting convention
    AND c.type IN ('opex', 'cogs', 'liability')  -- But categorized as expense
    AND (
      -- E-commerce revenue patterns
      t.description ILIKE '%MARKETPLACE%' OR
      t.description ILIKE '%AMAZON%ORDER%' OR
      t.description ILIKE '%ETSY%SALE%' OR
      t.description ILIKE '%EBAY%SALE%' OR
      t.description ILIKE '%SHOPIFY%SALE%' OR
      t.description ILIKE '%ONLINE STORE%' OR
      t.description ILIKE '%WHOLESALE ORDER%' OR
      t.description ILIKE '%SHIPPING FEE COLLECTED%' OR
      t.description ILIKE '%PO-%' OR  -- Purchase order pattern
      t.description ILIKE '%PO %' OR
      -- B2B/Service patterns that might be in test data
      t.description ILIKE '%CLIENT%' OR
      t.description ILIKE '%CUSTOMER PAYMENT%' OR
      t.description ILIKE '%WIRE CREDIT%' OR
      t.description ILIKE '%ACH CREDIT%' OR
      t.description ILIKE '%INV %' OR
      t.description ILIKE '%INVOICE%'
    )
)
-- Update transactions: clear category and mark for review
UPDATE transactions t
SET 
  category_id = NULL,
  confidence = NULL,
  needs_review = TRUE,
  reviewed = FALSE
FROM miscategorized m
WHERE t.id = m.id;

-- Delete corresponding decisions
DELETE FROM decisions d
WHERE d.tx_id IN (
  SELECT t.id
  FROM transactions t
  WHERE t.category_id IS NULL
    AND t.needs_review = TRUE
    AND t.amount_cents > 0
);

-- Report: Show transactions that will be recategorized
SELECT 
  COUNT(*) as transactions_to_recategorize,
  'Run categorization queue to recategorize these transactions' as next_step
FROM transactions t
WHERE t.category_id IS NULL
  AND t.needs_review = TRUE
  AND t.amount_cents > 0;

