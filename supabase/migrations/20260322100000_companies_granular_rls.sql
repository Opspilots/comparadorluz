-- Migration: Granular RLS on companies table
-- Prevents managers from modifying sensitive fields (subscription_tier, status)
-- Only admins can update those; managers can update branding/settings only.

BEGIN;

-- Drop the permissive policy that allows any admin/manager to update ALL columns
DROP POLICY IF EXISTS "Admins can update their own company" ON public.companies;

-- Admin: can update any column in their company
CREATE POLICY "Admins can update their own company"
  ON public.companies FOR UPDATE
  USING (
    id = public.get_auth_company_id()
    AND public.get_auth_user_role() = 'admin'
  )
  WITH CHECK (id = public.get_auth_company_id());

-- Manager: can update branding/settings but NOT subscription_tier or status
-- Implemented via trigger that rejects changes to protected columns by non-admins
CREATE OR REPLACE FUNCTION public.protect_company_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is not admin, block changes to protected fields
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_company_admin_fields ON public.companies;
CREATE TRIGGER trg_protect_company_admin_fields
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_admin_fields();

-- Manager: can update non-sensitive fields in their company
CREATE POLICY "Managers can update company branding"
  ON public.companies FOR UPDATE
  USING (
    id = public.get_auth_company_id()
    AND public.get_auth_user_role() = 'manager'
  )
  WITH CHECK (id = public.get_auth_company_id());

COMMIT;
