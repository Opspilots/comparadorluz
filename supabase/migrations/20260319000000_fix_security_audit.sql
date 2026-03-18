-- Migration: Fix critical security issues found in code audit 2026-03-18
-- Fixes: commissioners RLS, users INSERT escalation, companies RLS, integration_providers RLS
-- IMPORTANT: All policies on `users` table must avoid direct subqueries on `users`
-- to prevent infinite RLS recursion. Use SECURITY DEFINER helpers instead.
BEGIN;

-- ============================================================================
-- Helper: get_auth_user_role() — SECURITY DEFINER to bypass RLS on users table
-- Needed for role-based RLS policies that would otherwise recurse.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- #1: Fix commissioners SELECT policy — auth.company_id() does not exist
-- ============================================================================
DROP POLICY IF EXISTS "Users can view commissioners from their company" ON public.commissioners;
CREATE POLICY "Users can view commissioners from their company"
  ON public.commissioners FOR SELECT
  USING (company_id = public.get_auth_company_id());

-- ============================================================================
-- #2: Fix commissioners ALL policy — was missing company_id check (cross-tenant)
-- Uses get_auth_user_role() to avoid recursion through users table RLS.
-- ============================================================================
DROP POLICY IF EXISTS "Admins/Managers can manage commissioners" ON public.commissioners;
CREATE POLICY "Admins/Managers can manage commissioners"
  ON public.commissioners FOR ALL
  USING (
    company_id = public.get_auth_company_id()
    AND public.get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    company_id = public.get_auth_company_id()
    AND public.get_auth_user_role() IN ('admin', 'manager')
  );

-- ============================================================================
-- #3: Fix users INSERT policy — prevent self-escalation to admin role
-- Only allow 'commercial' role on self-signup; admins manage role changes via RPC.
-- create_company_with_user is SECURITY DEFINER and bypasses RLS, so it can
-- still insert with role='admin'.
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid() AND role = 'commercial');

-- ============================================================================
-- #4: Add users UPDATE policy — only admins/managers can update users in company
-- Uses SECURITY DEFINER helpers to avoid recursion on users table.
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update users in their company" ON public.users;
CREATE POLICY "Admins can update users in their company"
  ON public.users FOR UPDATE
  USING (
    company_id = public.get_auth_company_id()
    AND public.get_auth_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (company_id = public.get_auth_company_id());

-- ============================================================================
-- #5: Enable RLS on companies table — was never enabled, exposing all tenant data
-- Uses get_auth_company_id() (SECURITY DEFINER) to avoid recursion through users.
-- ============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_auth_company_id());

-- INSERT: only through create_company_with_user RPC (SECURITY DEFINER bypasses RLS)
-- No INSERT policy needed for regular users

-- ============================================================================
-- #6: Enable RLS on integration_providers — was open to any authenticated user
-- ============================================================================
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read integration providers"
  ON public.integration_providers FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- #7: Add company-scoped SELECT on users for team features
-- The force_clear_policies migration restricted users to own-profile-only,
-- breaking team listing features. Uses get_auth_company_id() (SECURITY DEFINER)
-- to avoid infinite recursion on the users table's own RLS policies.
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view users in their company"
  ON public.users FOR SELECT
  USING (
    id = auth.uid()
    OR company_id = public.get_auth_company_id()
  );

COMMIT;
