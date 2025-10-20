-- 047_add_institution_data.sql
-- Add institution identification columns for better account/connection branding
-- Stores Plaid institution data for displaying bank logos and names

-- Add institution columns to connections table
ALTER TABLE connections 
  ADD COLUMN IF NOT EXISTS institution_id text,
  ADD COLUMN IF NOT EXISTS institution_name text;

-- Create index for faster institution lookups
CREATE INDEX IF NOT EXISTS idx_connections_institution_id 
  ON connections(institution_id) 
  WHERE institution_id IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN connections.institution_id IS 
  'Plaid institution ID (e.g., ins_3 for Chase). Used for API calls and unique identification.';

COMMENT ON COLUMN connections.institution_name IS 
  'Human-readable institution name from Plaid (e.g., "Chase"). Displayed in UI and used for logo mapping.';

-- Add institution_name to accounts table (denormalized for performance)
-- This avoids joins when querying transactions with account details
ALTER TABLE accounts 
  ADD COLUMN IF NOT EXISTS institution_name text;

COMMENT ON COLUMN accounts.institution_name IS 
  'Institution name inherited from parent connection. Denormalized for query performance to avoid joins when displaying transaction lists.';

-- Note: Existing connections will have NULL values
-- They can be backfilled by:
-- 1. Re-linking the account (recommended - captures fresh data)
-- 2. Running a backfill script using Plaid Item/Institution APIs (optional)
-- 3. Manual update based on account names (fallback)

