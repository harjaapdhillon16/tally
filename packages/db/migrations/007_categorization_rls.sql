-- 007_categorization_rls.sql - RLS policies for categorization tables

-- Decisions table policies - scoped by transaction org_id
DROP POLICY IF EXISTS "decisions_select_member" ON decisions;
CREATE POLICY "decisions_select_member" ON decisions
    FOR SELECT USING (
        tx_id IN (
            SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
        )
    );

DROP POLICY IF EXISTS "decisions_insert_member" ON decisions;
CREATE POLICY "decisions_insert_member" ON decisions
    FOR INSERT WITH CHECK (
        tx_id IN (
            SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
        )
    );

DROP POLICY IF EXISTS "decisions_update_member" ON decisions;
CREATE POLICY "decisions_update_member" ON decisions
    FOR UPDATE USING (
        tx_id IN (
            SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
        )
    );

DROP POLICY IF EXISTS "decisions_delete_member" ON decisions;
CREATE POLICY "decisions_delete_member" ON decisions
    FOR DELETE USING (
        tx_id IN (
            SELECT id FROM transactions WHERE public.user_in_org(org_id) = true
        )
    );

-- Corrections table policies - directly scoped by org_id
DROP POLICY IF EXISTS "corrections_select_member" ON corrections;
CREATE POLICY "corrections_select_member" ON corrections
    FOR SELECT USING (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "corrections_insert_member" ON corrections;
CREATE POLICY "corrections_insert_member" ON corrections
    FOR INSERT WITH CHECK (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "corrections_update_member" ON corrections;
CREATE POLICY "corrections_update_member" ON corrections
    FOR UPDATE USING (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "corrections_delete_member" ON corrections;
CREATE POLICY "corrections_delete_member" ON corrections
    FOR DELETE USING (public.user_in_org(org_id) = true);

-- Vendor embeddings table policies - directly scoped by org_id
DROP POLICY IF EXISTS "vendor_embeddings_select_member" ON vendor_embeddings;
CREATE POLICY "vendor_embeddings_select_member" ON vendor_embeddings
    FOR SELECT USING (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "vendor_embeddings_insert_member" ON vendor_embeddings;
CREATE POLICY "vendor_embeddings_insert_member" ON vendor_embeddings
    FOR INSERT WITH CHECK (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "vendor_embeddings_update_member" ON vendor_embeddings;
CREATE POLICY "vendor_embeddings_update_member" ON vendor_embeddings
    FOR UPDATE USING (public.user_in_org(org_id) = true);

DROP POLICY IF EXISTS "vendor_embeddings_delete_member" ON vendor_embeddings;
CREATE POLICY "vendor_embeddings_delete_member" ON vendor_embeddings
    FOR DELETE USING (public.user_in_org(org_id) = true);