-- 048_add_shopify_source.sql
-- Add 'shopify' as a valid source for transactions
-- This enables real-time revenue ingestion from Shopify orders and refunds

-- Update the transactions.source check constraint to include 'shopify'
ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE transactions 
  ADD CONSTRAINT transactions_source_check 
  CHECK (source IN ('plaid', 'square', 'manual', 'shopify'));

-- Add comment for documentation
COMMENT ON COLUMN transactions.source IS 
  'Data source: plaid (bank transactions), square (POS), shopify (e-commerce orders/refunds), manual (user-entered)';

-- Note: connections.provider does not have a constraint in the schema,
-- so 'shopify' can be used without modification




