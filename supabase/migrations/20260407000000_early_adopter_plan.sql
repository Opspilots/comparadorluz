BEGIN;

-- ============================================================================
-- 1. Create "early_adopter" plan — Pro features, free forever, no Stripe
-- ============================================================================

INSERT INTO plans (name, display_name, price_monthly, price_yearly, sort_order, is_free, limits, features)
VALUES (
    'early_adopter',
    'Early Adopter',
    0,
    0,
    3,
    false,
    '{"max_users": -1, "max_supply_points": -1, "ai_uses_per_month": -1, "comparisons_per_month": -1, "messages_per_month": -1, "max_customers": -1}',
    '{"crm": true, "comparator": true, "messaging": true, "commissioners": true, "compliance": true, "pdf_reports": true, "api_access": true, "advanced_analytics": true, "tariff_upload": true}'
)
ON CONFLICT (name) DO UPDATE SET
    display_name  = EXCLUDED.display_name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly  = EXCLUDED.price_yearly,
    sort_order    = EXCLUDED.sort_order,
    limits        = EXCLUDED.limits,
    features      = EXCLUDED.features;

-- ============================================================================
-- 2. Assign ALL existing companies to early_adopter plan
--    (overrides the previous backfill that set them to free)
-- ============================================================================

UPDATE companies
SET plan_id = (SELECT id FROM plans WHERE name = 'early_adopter')
WHERE plan_id IS NULL
   OR plan_id = (SELECT id FROM plans WHERE name = 'free');

-- ============================================================================
-- 3. Update create_company_with_user to assign free plan to NEW companies
-- ============================================================================

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
  v_free_plan_id UUID;
BEGIN
  -- Security: ensure the caller is creating for themselves
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: p_user_id must match the calling user';
  END IF;

  -- Look up free plan
  SELECT id INTO v_free_plan_id FROM plans WHERE name = 'free' LIMIT 1;

  -- 1. Create the company with free plan
  INSERT INTO companies (name, email, cif, status, plan_id)
  VALUES (p_company_name, p_email, p_cif, 'active', v_free_plan_id)
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

COMMIT;
