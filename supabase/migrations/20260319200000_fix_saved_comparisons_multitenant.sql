-- Fix saved_comparisons: add company_id for multi-tenancy
-- Previously scoped only by user_id, breaking team collaboration and tenant isolation

BEGIN;

-- 1. Add company_id column
ALTER TABLE saved_comparisons
    ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 2. Backfill company_id from the user's profile
UPDATE saved_comparisons sc
SET company_id = u.company_id
FROM users u
WHERE sc.user_id = u.id;

-- 3. Make company_id NOT NULL after backfill
ALTER TABLE saved_comparisons
    ALTER COLUMN company_id SET NOT NULL;

-- 4. Add index for tenant-scoped queries
CREATE INDEX idx_saved_comparisons_company_id ON saved_comparisons(company_id);

-- 5. Drop old user-only RLS policies
DROP POLICY IF EXISTS "Users can view their own comparisons" ON saved_comparisons;
DROP POLICY IF EXISTS "Users can insert their own comparisons" ON saved_comparisons;
DROP POLICY IF EXISTS "Users can update their own comparisons" ON saved_comparisons;
DROP POLICY IF EXISTS "Users can delete their own comparisons" ON saved_comparisons;

-- 6. Create new company-scoped RLS policies (team members can see all company comparisons)
CREATE POLICY "Company members can view comparisons"
    ON saved_comparisons FOR SELECT
    USING (company_id = auth.company_id());

CREATE POLICY "Company members can insert comparisons"
    ON saved_comparisons FOR INSERT
    WITH CHECK (company_id = auth.company_id());

CREATE POLICY "Users can update their own comparisons"
    ON saved_comparisons FOR UPDATE
    USING (company_id = auth.company_id() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own comparisons"
    ON saved_comparisons FOR DELETE
    USING (company_id = auth.company_id() AND user_id = auth.uid());

-- 7. Add updated_at trigger
CREATE OR REPLACE TRIGGER set_updated_at_saved_comparisons
    BEFORE UPDATE ON saved_comparisons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

COMMIT;
