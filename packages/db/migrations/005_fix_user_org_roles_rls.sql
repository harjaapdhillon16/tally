-- 005_fix_user_org_roles_rls.sql - Fix circular RLS dependency for user_org_roles

-- Drop the restrictive policy that causes circular dependency
DROP POLICY IF EXISTS "user_org_roles_select_member" ON user_org_roles;

-- Create a new policy that allows users to read their own records
CREATE POLICY "user_org_roles_select_own_or_member" ON user_org_roles
    FOR SELECT USING (
        user_id = auth.uid() OR public.user_in_org(org_id) = true
    );

-- This allows:
-- 1. Users to always read their own records (even if they have no orgs)
-- 2. Organization members to read records within their orgs
-- 3. Breaks the circular dependency by providing a non-circular path