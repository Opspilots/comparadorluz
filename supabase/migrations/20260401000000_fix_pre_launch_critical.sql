-- Migration: Fix 3 critical pre-launch issues
-- Date: 2026-04-01
--
-- Fix 1: tariff_versions SELECT policy references dropped column supplier_name
-- Fix 2: Broken updated_at triggers on contract_templates and integrations (wrong function name)
-- Fix 3: (Edge function fix applied separately — sync-electricity-prices → market_prices)

BEGIN;

-- ============================================================================
-- Fix 1: Broken tariff_versions SELECT policy
-- The policy created in 20260319100000 references tariff_versions.supplier_name
-- which was dropped in 20260204130100 and replaced by supplier_id (FK to suppliers).
-- Rewrite to JOIN through supplier_id → suppliers.
-- ============================================================================
DROP POLICY IF EXISTS "All users can read active tariffs" ON public.tariff_versions;

CREATE POLICY "All users can read active tariffs"
  ON public.tariff_versions FOR SELECT
  USING (
    company_id = public.get_auth_company_id()
    OR EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = tariff_versions.supplier_id
        AND s.is_global = true
    )
  );

-- ============================================================================
-- Fix 2a: Broken updated_at trigger on contract_templates
-- Created in 20260303140000 referencing public.set_updated_at() which does not exist.
-- The correct function is update_updated_at_column().
-- ============================================================================
DROP TRIGGER IF EXISTS set_contract_templates_updated_at ON public.contract_templates;

CREATE TRIGGER set_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Fix 2b: Broken updated_at trigger on integrations
-- Created in 20260305120000 referencing public.set_updated_at() which does not exist.
-- The correct function is update_updated_at_column().
-- ============================================================================
DROP TRIGGER IF EXISTS set_integrations_updated_at ON public.integrations;

CREATE TRIGGER set_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
