-- Migration: Remove recursive RLS policies to fix "infinite recursion detected"
-- Only allow users to view their own profile for now, which breaks the recursion loop.

BEGIN;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view users from their company" ON public.users;

-- Ensure "Users can view own profile" exists (re-applying just in case)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

COMMIT;
