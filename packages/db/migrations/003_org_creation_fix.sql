-- 003_org_creation_fix.sql - Fix organization creation RLS policies

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "orgs_insert_member" ON orgs;
DROP POLICY IF EXISTS "user_org_roles_insert_member" ON user_org_roles;

-- Create more permissive insert policies for organization creation
CREATE POLICY "orgs_insert_owner" ON orgs
    FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "user_org_roles_insert_self" ON user_org_roles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create a secure function for atomic org creation
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    org_name text,
    org_industry text DEFAULT NULL,
    org_timezone text DEFAULT 'UTC'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id uuid;
    current_user_id uuid;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Insert new organization
    INSERT INTO orgs (name, industry, timezone, owner_user_id)
    VALUES (org_name, org_industry, org_timezone, current_user_id)
    RETURNING id INTO new_org_id;
    
    -- Insert owner role
    INSERT INTO user_org_roles (user_id, org_id, role)
    VALUES (current_user_id, new_org_id, 'owner');
    
    RETURN new_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner TO authenticated;