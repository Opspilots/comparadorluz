-- Migration: Ensure users can always view their own profile
-- This fixes potential circular dependencies in RLS when looking up company_id

BEGIN;

-- Drop policy if it exists to avoid conflicts (or create if not exists)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

COMMIT;
