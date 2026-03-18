-- Migration: Fix critical issues from code review 2026-03-18
-- Fixes:
--   1. Missing updated_at trigger on commissioners table
--   2. tariff_versions RLS to include global suppliers' tariffs
--   3. suppliers RLS to allow reading global suppliers
BEGIN;

-- ============================================================================
-- #1: Add missing updated_at trigger on commissioners table
-- Project convention: every table must have an updated_at trigger
-- ============================================================================
CREATE TRIGGER set_commissioners_updated_at
  BEFORE UPDATE ON public.commissioners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- #2: Update tariff_versions SELECT policy to include tariffs from global suppliers
-- Without this, tariffs tied to is_global suppliers are invisible to other tenants
-- ============================================================================
DROP POLICY IF EXISTS "All users can read active tariffs" ON public.tariff_versions;
CREATE POLICY "All users can read active tariffs"
  ON public.tariff_versions FOR SELECT
  USING (
    company_id = public.get_auth_company_id()
    OR EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.name = tariff_versions.supplier_name
      AND s.is_global = true
    )
  );

-- ============================================================================
-- #3: Update suppliers SELECT policy to include global suppliers
-- Without this, is_global column has no effect on data access
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their company suppliers" ON public.suppliers;
CREATE POLICY "Users can view their company suppliers"
  ON public.suppliers FOR SELECT
  USING (
    is_global = true
    OR company_id = public.get_auth_company_id()
  );

COMMIT;
