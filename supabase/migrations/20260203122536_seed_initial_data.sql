-- Migration: Seed initial data for energy tariffs and commission rules
-- Market data for Endesa and Iberdrola to enable immediate comparisons.

BEGIN;

DO $$ 
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_batch_id UUID;
  v_endesa_v1 UUID;
  v_iberdrola_v1 UUID;
BEGIN
  -- Get first company and user
  SELECT id INTO v_company_id FROM public.companies LIMIT 1;
  SELECT id INTO v_user_id FROM public.users WHERE company_id = v_company_id LIMIT 1;

  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE NOTICE 'No company or user found. Skipping seed.';
    RETURN;
  END IF;

  -- Create a published batch
  INSERT INTO public.tariff_batches (company_id, uploaded_by, status, file_count, published_by, published_at)
  VALUES (v_company_id, v_user_id, 'published', 2, v_user_id, now())
  RETURNING id INTO v_batch_id;

  -- 1. ENDESA Tariffs
  INSERT INTO public.tariff_versions (company_id, batch_id, supplier_name, tariff_name, tariff_code, tariff_type, valid_from, is_active)
  VALUES (v_company_id, v_batch_id, 'Endesa', 'One Luz', 'END-ONE-20', '2.0TD', '2026-01-01', true)
  RETURNING id INTO v_endesa_v1;

  INSERT INTO public.tariff_components (company_id, tariff_version_id, component_type, period, price_eur_kwh, price_eur_kw_year, fixed_price_eur_month)
  VALUES 
    (v_company_id, v_endesa_v1, 'energy_price', 'P1', 0.145, NULL, NULL),
    (v_company_id, v_endesa_v1, 'energy_price', 'P2', 0.120, NULL, NULL),
    (v_company_id, v_endesa_v1, 'power_price', 'P1', NULL, 35.50, NULL),
    (v_company_id, v_endesa_v1, 'fixed_fee', NULL, NULL, NULL, 4.50);

  -- 2. IBERDROLA Tariffs
  INSERT INTO public.tariff_versions (company_id, batch_id, supplier_name, tariff_name, tariff_code, tariff_type, valid_from, is_active)
  VALUES (v_company_id, v_batch_id, 'Iberdrola', 'Plan Online', 'IBE-ONL-20', '2.0TD', '2026-01-01', true)
  RETURNING id INTO v_iberdrola_v1;

  INSERT INTO public.tariff_components (company_id, tariff_version_id, component_type, period, price_eur_kwh, price_eur_kw_year, fixed_price_eur_month)
  VALUES 
    (v_company_id, v_iberdrola_v1, 'energy_price', 'P1', 0.138, NULL, NULL),
    (v_company_id, v_iberdrola_v1, 'energy_price', 'P2', 0.115, NULL, NULL),
    (v_company_id, v_iberdrola_v1, 'power_price', 'P1', NULL, 38.00, NULL),
    (v_company_id, v_iberdrola_v1, 'fixed_fee', NULL, NULL, NULL, 5.00);

  -- 3. Default Commission Rule for the admin
  INSERT INTO public.commission_rules (company_id, user_id, commission_pct, valid_from, is_active)
  VALUES (v_company_id, v_user_id, 15.00, '2026-01-01', true);

END $$;

COMMIT;
