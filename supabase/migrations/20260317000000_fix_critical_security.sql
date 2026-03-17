-- Fix critical security vulnerabilities found in audit 2026-03-17
BEGIN;

-- #1: Add UPDATE policy on companies (was missing — cross-tenant writes possible)
CREATE POLICY "Users can update their own company"
  ON public.companies FOR UPDATE
  USING (id IN (SELECT company_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- #2: Add DELETE policy on companies (restrict to own tenant)
CREATE POLICY "Users can delete their own company"
  ON public.companies FOR DELETE
  USING (id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- #3: Drop overly permissive anonymous INSERT policy (was "WITH CHECK (true)")
-- Signup now goes through create_company_with_user SECURITY DEFINER RPC, so this is no longer needed
DROP POLICY IF EXISTS "Allow public company creation" ON public.companies;

-- All company creation now goes through the SECURITY DEFINER RPC create_company_with_user
-- No fallback INSERT policy needed — the RPC handles its own insert

-- #4: Fix create_company_with_user RPC — validate p_user_id matches caller
CREATE OR REPLACE FUNCTION create_company_with_user(
  p_user_id UUID,
  p_email TEXT,
  p_company_name TEXT,
  p_cif TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Security: ensure the caller is creating for themselves, not impersonating another user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: p_user_id must match the calling user';
  END IF;

  -- 1. Create the company
  INSERT INTO companies (name, email, cif, status)
  VALUES (p_company_name, p_email, p_cif, 'active')
  RETURNING id INTO v_company_id;

  -- 2. Create the user link
  INSERT INTO users (id, company_id, email, full_name, role, status)
  VALUES (
    p_user_id,
    v_company_id,
    p_email,
    'Usuario Inicial',
    'admin',
    'active'
  );

  -- 3. Seed default suppliers for the new company
  PERFORM seed_default_suppliers(v_company_id);
END;
$$;

-- #5: Drop overly permissive INSERT policy on market_prices
-- Service role bypasses RLS by default, so no INSERT policy is needed
-- The old policy allowed any authenticated user to write global market data
DROP POLICY IF EXISTS "service_role_can_insert_market_prices" ON public.market_prices;

COMMIT;
