-- Migration: Fix billing column escalation and role escalation attack vectors
-- Date: 2026-05-30
-- Security issues addressed:
--   1. Billing columns (plan_id, plan_expires_at, stripe_*) writable by any admin → lock to service_role only
--   2. users.role column writable by any admin/manager via UPDATE policy → lock to service_role only
--   3. plans table has no RLS → authenticated users can read/write plan definitions

BEGIN;

-- ============================================================================
-- FIX 1 — Protect billing columns on `companies`
-- ============================================================================
-- The previous trigger protect_company_admin_fields() only guarded
-- subscription_tier and status. The billing_system migration (20260405)
-- added plan_id, plan_expires_at, stripe_customer_id, stripe_subscription_id
-- to the companies table, but the trigger was never extended to cover them.
-- Any company admin could craft an UPDATE to set their own plan_id to
-- 'professional' or clear stripe_subscription_id.
--
-- New rule: billing columns may ONLY be mutated by the Stripe webhook running
-- as service_role (auth.uid() IS NULL). Regular authenticated sessions —
-- including company admins — are blocked at the trigger level regardless of
-- RLS policy.
-- ============================================================================

-- Drop existing trigger first (idempotent), then drop the old function so we
-- can replace it with the extended version.
DROP TRIGGER IF EXISTS trg_protect_company_admin_fields ON public.companies;
DROP FUNCTION IF EXISTS public.protect_company_admin_fields();

CREATE OR REPLACE FUNCTION public.protect_company_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Billing columns (plan_id, plan_expires_at, stripe_*) ─────────────────
  -- These are exclusively managed by the Stripe webhook (service_role).
  -- auth.uid() IS NULL means the caller is service_role / a privileged
  -- server-side process — the only legitimate writer for billing state.
  IF auth.uid() IS NOT NULL THEN
    IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
      RAISE EXCEPTION 'plan_id solo puede ser modificado por el sistema de facturación (service_role)';
    END IF;
    IF NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
      RAISE EXCEPTION 'plan_expires_at solo puede ser modificado por el sistema de facturación (service_role)';
    END IF;
    IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
      RAISE EXCEPTION 'stripe_customer_id solo puede ser modificado por el sistema de facturación (service_role)';
    END IF;
    IF NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
      RAISE EXCEPTION 'stripe_subscription_id solo puede ser modificado por el sistema de facturación (service_role)';
    END IF;
  END IF;

  -- ── Legacy admin-only fields (subscription_tier, status) ─────────────────
  -- Preserve the original behavior: only admins can change these, but even
  -- admins cannot change billing columns (handled above).
  IF public.get_auth_user_role() != 'admin' THEN
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
      RAISE EXCEPTION 'Solo administradores pueden cambiar el plan de suscripción';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Solo administradores pueden cambiar el estado de la empresa';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (BEFORE UPDATE so we abort before any write hits disk)
CREATE TRIGGER trg_protect_company_admin_fields
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_admin_fields();


-- ============================================================================
-- FIX 2 — Protect `role` and `company_id` columns on `users`
-- ============================================================================
-- The existing RLS policy "Admins can update users in their company"
-- (20260319000000_fix_security_audit.sql) grants UPDATE on ALL columns of
-- users to any admin or manager. This allows:
--   • An admin to promote themselves or another user to 'admin'
--   • A manager to change their own role
--   • Any privileged user to move a user to a different company (company_id)
--
-- A trigger at the row level is the correct enforcement layer because RLS
-- WITH CHECK clauses cannot compare OLD vs NEW column values.
--
-- Rules implemented:
--   a) Only service_role (auth.uid() IS NULL) may change the `role` column
--   b) A user can never change their own role (belt-and-suspenders)
--   c) No one (including service_role) may change a user's company_id after
--      creation — tenant migrations require a dedicated, audited RPC.
-- ============================================================================

DROP TRIGGER IF EXISTS protect_user_role_changes_trigger ON public.users;
DROP FUNCTION IF EXISTS public.protect_user_role_changes();

CREATE OR REPLACE FUNCTION public.protect_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Rule (a): role changes are service_role-only ──────────────────────────
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'El campo role solo puede ser modificado por procesos de sistema (service_role). Use la RPC correspondiente.';
    END IF;
  END IF;

  -- ── Rule (b): company_id is immutable after creation ─────────────────────
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'company_id es inmutable. Las migraciones de tenant requieren una RPC dedicada con auditoría.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_user_role_changes_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_role_changes();


-- ============================================================================
-- FIX 3 — Enable RLS on `plans` table
-- ============================================================================
-- The plans table was created in 20260405000000_billing_system.sql without
-- enabling RLS. Any authenticated user could:
--   • Read all plan definitions (minor — not secret, but still open)
--   • Attempt INSERT/UPDATE/DELETE on plan rows (critical — could corrupt
--     limits/features JSON used for access control decisions)
--
-- Policy: authenticated users can SELECT plans (needed to render the pricing
-- page and to resolve plan metadata client-side). No write access for regular
-- roles — writes happen only via service_role (migrations / admin scripts).
-- ============================================================================

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_read_authenticated" ON public.plans;
CREATE POLICY "plans_read_authenticated"
  ON public.plans
  FOR SELECT
  TO authenticated
  USING (true);

-- Intentionally no INSERT / UPDATE / DELETE policies for authenticated users.
-- service_role bypasses RLS and can still manage plan rows directly.

COMMIT;
