-- Fix: saved_comparisons RLS policies used auth.company_id() which does not exist.
-- Correct function is public.get_auth_company_id()

BEGIN;

-- Drop the broken policies created by the previous migration
DROP POLICY IF EXISTS "Company members can view comparisons" ON saved_comparisons;
DROP POLICY IF EXISTS "Company members can insert comparisons" ON saved_comparisons;
DROP POLICY IF EXISTS "Users can update their own comparisons" ON saved_comparisons;
DROP POLICY IF EXISTS "Users can delete their own comparisons" ON saved_comparisons;

-- Recreate with the correct function
CREATE POLICY "Company members can view comparisons"
    ON saved_comparisons FOR SELECT
    USING (company_id = public.get_auth_company_id());

CREATE POLICY "Company members can insert comparisons"
    ON saved_comparisons FOR INSERT
    WITH CHECK (company_id = public.get_auth_company_id());

CREATE POLICY "Users can update their own comparisons"
    ON saved_comparisons FOR UPDATE
    USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own comparisons"
    ON saved_comparisons FOR DELETE
    USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

COMMIT;
