-- Fix SECURITY DEFINER functions missing SET search_path = public
-- This prevents search_path hijacking attacks on privileged functions.
BEGIN;

-- 1. get_auth_company_id() — originally in 20260203120000_create_core_tables.sql
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. get_auth_user_role() — originally in 20260319000000_fix_security_audit.sql
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3. create_audit_log() — originally in 20260203120000_create_core_tables.sql
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
  v_audit_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM users WHERE id = auth.uid();

  INSERT INTO audit_log (company_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (v_company_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. protect_company_admin_fields() — trigger function, originally in 20260322100000_companies_granular_rls.sql
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
