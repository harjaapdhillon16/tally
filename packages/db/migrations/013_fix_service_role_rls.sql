-- 013_fix_service_role_rls.sql - Fix RLS policies to support service role operations
-- Addresses issue where Edge Functions using service role cannot perform database operations
-- due to RLS policies expecting authenticated user context

-- Update user_in_org function to handle service role context
-- Service role should be able to perform operations with explicit org validation
CREATE OR REPLACE FUNCTION public.user_in_org(target_org uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    -- Allow service role to bypass user_in_org check if explicitly called with org context
    -- This is safe because service role operations in Edge Functions validate org membership separately
    SELECT CASE
        WHEN auth.jwt() ->> 'role' = 'service_role' THEN true
        ELSE EXISTS (
            SELECT 1
            FROM user_org_roles
            WHERE user_id = auth.uid()
            AND org_id = target_org
        )
    END;
$$;

-- Add service role bypass function for explicit org validation in Edge Functions
-- This function is used when Edge Functions need to validate org access explicitly
CREATE OR REPLACE FUNCTION public.validate_service_role_org_access(target_org uuid, jwt_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    -- Validate that the user from the JWT belongs to the target organization
    -- This is called explicitly in Edge Functions with org validation
    SELECT EXISTS (
        SELECT 1
        FROM user_org_roles
        WHERE user_id = jwt_user_id
        AND org_id = target_org
    );
$$;

-- Update connections table policies to handle service role operations
-- The service role needs to insert connections during Plaid exchange
DROP POLICY IF EXISTS "connections_insert_member" ON connections;
CREATE POLICY "connections_insert_member" ON connections
    FOR INSERT WITH CHECK (
        -- Allow regular authenticated users with org membership
        (auth.jwt() ->> 'role' = 'authenticated' AND public.user_in_org(org_id) = true)
        OR
        -- Allow service role (Edge Functions will validate org access separately)
        (auth.jwt() ->> 'role' = 'service_role')
    );

-- Update connections table update policy for service role
DROP POLICY IF EXISTS "connections_update_member" ON connections;
CREATE POLICY "connections_update_member" ON connections
    FOR UPDATE USING (
        -- Allow regular authenticated users with org membership
        (auth.jwt() ->> 'role' = 'authenticated' AND public.user_in_org(org_id) = true)
        OR
        -- Allow service role (Edge Functions will validate org access separately)
        (auth.jwt() ->> 'role' = 'service_role')
    );

-- Ensure connection_secrets table allows service role operations
-- This table is already configured to only allow service role access
-- But let's make it explicit for clarity
REVOKE ALL ON connection_secrets FROM authenticated;
REVOKE ALL ON connection_secrets FROM anon;
GRANT ALL ON connection_secrets TO service_role;

-- Add audit table for service role operations to maintain security visibility
CREATE TABLE IF NOT EXISTS service_role_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    operation text NOT NULL,
    org_id uuid NOT NULL,
    user_id uuid NULL, -- From JWT when available
    edge_function text NULL,
    created_at timestamptz DEFAULT now()
);

-- No RLS on audit table - only service role can access
REVOKE ALL ON service_role_audit FROM authenticated;
REVOKE ALL ON service_role_audit FROM anon;
GRANT ALL ON service_role_audit TO service_role;

-- Create function to log service role operations
CREATE OR REPLACE FUNCTION public.log_service_role_operation(
    p_table_name text,
    p_operation text,
    p_org_id uuid,
    p_user_id uuid DEFAULT NULL,
    p_edge_function text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO service_role_audit (table_name, operation, org_id, user_id, edge_function)
    VALUES (p_table_name, p_operation, p_org_id, p_user_id, p_edge_function);
$$;

-- Add indexes for audit table performance
CREATE INDEX IF NOT EXISTS idx_service_role_audit_org_id ON service_role_audit(org_id);
CREATE INDEX IF NOT EXISTS idx_service_role_audit_created_at ON service_role_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_service_role_audit_table_operation ON service_role_audit(table_name, operation);

-- Update other critical tables that Edge Functions might need to access
-- Accounts table policies for service role
DROP POLICY IF EXISTS "accounts_insert_member" ON accounts;
CREATE POLICY "accounts_insert_member" ON accounts
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'role' = 'authenticated' AND public.user_in_org(org_id) = true)
        OR
        (auth.jwt() ->> 'role' = 'service_role')
    );

DROP POLICY IF EXISTS "accounts_update_member" ON accounts;
CREATE POLICY "accounts_update_member" ON accounts
    FOR UPDATE USING (
        (auth.jwt() ->> 'role' = 'authenticated' AND public.user_in_org(org_id) = true)
        OR
        (auth.jwt() ->> 'role' = 'service_role')
    );

-- Transactions table policies for service role
DROP POLICY IF EXISTS "transactions_insert_member" ON transactions;
CREATE POLICY "transactions_insert_member" ON transactions
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'role' = 'authenticated' AND public.user_in_org(org_id) = true)
        OR
        (auth.jwt() ->> 'role' = 'service_role')
    );

DROP POLICY IF EXISTS "transactions_update_member" ON transactions;
CREATE POLICY "transactions_update_member" ON transactions
    FOR UPDATE USING (
        (auth.jwt() ->> 'role' = 'authenticated' AND public.user_in_org(org_id) = true)
        OR
        (auth.jwt() ->> 'role' = 'service_role')
    );

-- Grant necessary permissions to service role for Edge Function operations
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comment for security auditing
COMMENT ON FUNCTION public.user_in_org IS 'Updated to support service role operations while maintaining security. Service role bypass is safe because Edge Functions validate org membership explicitly.';
COMMENT ON FUNCTION public.validate_service_role_org_access IS 'Explicit org validation function for Edge Functions using service role. Must be called with validated JWT user ID.';
COMMENT ON TABLE service_role_audit IS 'Audit trail for service role operations to maintain security visibility and compliance.';