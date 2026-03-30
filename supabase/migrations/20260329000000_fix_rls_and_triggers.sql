-- Migration: Fix 4 critical RLS/trigger issues
-- 1. Companies DELETE restricted to admin only
-- 2. Drop unscoped anon UPDATE policy on consent_requests
-- 3. Fix wrong trigger function name on saved_comparisons
-- 4. Drop recursive ALL policy on users table

BEGIN;

-- ============================================================================
-- Fix 1: Companies DELETE — restrict to admin only
-- The old policy "Users can delete their own company" allowed any authenticated
-- user to delete their company. Only admins should be able to do this.
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete their own company" ON public.companies;

CREATE POLICY "Only admins can delete their company"
  ON public.companies FOR DELETE
  USING (
    id = public.get_auth_company_id()
    AND public.get_auth_user_role() = 'admin'
  );

-- ============================================================================
-- Fix 2: Drop unscoped anon UPDATE policy on consent_requests
-- "Anon can mark viewed by token" allows any anonymous user to update rows
-- where status='sent' to status='viewed' without requiring token match.
-- Signing should go through the existing sign_consent_request SECURITY DEFINER RPC.
-- ============================================================================
DROP POLICY IF EXISTS "Anon can mark viewed by token" ON public.consent_requests;

-- ============================================================================
-- Fix 3: Fix wrong trigger function name on saved_comparisons
-- Migration 20260319200000 created a trigger calling update_updated_at() which
-- does not exist. The correct function is update_updated_at_column() from the
-- core tables migration.
-- ============================================================================
DROP TRIGGER IF EXISTS set_updated_at_saved_comparisons ON public.saved_comparisons;
DROP TRIGGER IF EXISTS update_saved_comparisons_updated_at ON public.saved_comparisons;

CREATE TRIGGER set_updated_at_saved_comparisons
    BEFORE UPDATE ON public.saved_comparisons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Fix 4: Drop recursive ALL policy on users table
-- "Admins can manage users in their company" from the core migration uses a
-- direct subquery on the users table (SELECT 1 FROM users WHERE id = auth.uid())
-- which causes infinite RLS recursion. Newer migrations (20260319000000) already
-- created proper per-operation policies using SECURITY DEFINER helpers.
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage users in their company" ON public.users;

COMMIT;
