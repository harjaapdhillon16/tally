-- 004_plaid_integration.sql - Extend schema for Plaid integration
-- Adds Plaid-specific columns and tables for secure token management and sync cursors

-- Add Plaid-specific columns to connections table
ALTER TABLE connections ADD COLUMN IF NOT EXISTS provider_item_id text NULL;

-- Add unique constraint to prevent duplicate Plaid items per org
DROP INDEX IF EXISTS idx_connections_org_provider_item;
CREATE UNIQUE INDEX idx_connections_org_provider_item 
ON connections(org_id, provider, provider_item_id) 
WHERE provider = 'plaid' AND provider_item_id IS NOT NULL;

-- Add provider-specific IDs to accounts for deduplication
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS provider_account_id text NULL;
DROP INDEX IF EXISTS idx_accounts_org_provider_account;
CREATE UNIQUE INDEX idx_accounts_org_provider_account 
ON accounts(org_id, provider_account_id) 
WHERE provider_account_id IS NOT NULL;

-- Add provider transaction IDs to transactions for deduplication
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider_tx_id text NULL;
DROP INDEX IF EXISTS idx_transactions_org_provider_tx;
CREATE UNIQUE INDEX idx_transactions_org_provider_tx 
ON transactions(org_id, provider_tx_id) 
WHERE provider_tx_id IS NOT NULL;

-- Create secure table for connection secrets (service-role only access)
CREATE TABLE IF NOT EXISTS connection_secrets (
    connection_id uuid PRIMARY KEY REFERENCES connections(id) ON DELETE CASCADE,
    access_token_encrypted text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- No RLS on connection_secrets - only service role can access
-- This table is intentionally not exposed to regular users
REVOKE ALL ON connection_secrets FROM authenticated;
REVOKE ALL ON connection_secrets FROM anon;

-- Create table for Plaid sync cursors
CREATE TABLE IF NOT EXISTS plaid_cursors (
    connection_id uuid PRIMARY KEY REFERENCES connections(id) ON DELETE CASCADE,
    cursor text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on plaid_cursors but allow service role full access
ALTER TABLE plaid_cursors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plaid_cursors_org_access" ON plaid_cursors;
CREATE POLICY "plaid_cursors_org_access" ON plaid_cursors
    FOR ALL USING (
        connection_id IN (
            SELECT id FROM connections WHERE public.user_in_org(org_id) = true
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_connection_secrets_connection_id ON connection_secrets(connection_id);
CREATE INDEX IF NOT EXISTS idx_plaid_cursors_connection_id ON plaid_cursors(connection_id);
CREATE INDEX IF NOT EXISTS idx_plaid_cursors_updated_at ON plaid_cursors(updated_at);

-- Add index for provider lookups
CREATE INDEX IF NOT EXISTS idx_connections_provider_item_id ON connections(provider, provider_item_id) 
WHERE provider_item_id IS NOT NULL;