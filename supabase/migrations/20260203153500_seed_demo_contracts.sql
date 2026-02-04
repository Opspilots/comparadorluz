-- Migration: Seed demo customers and contracts
-- Populates the CRM with mock clients and uses existing tariffs to create contracts.



DO $$ 
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_endesa_v1 UUID;
  v_iberdrola_v1 UUID;
  v_cust_1 UUID;
  v_cust_2 UUID;
  v_cust_3 UUID;
  v_cust_4 UUID;
BEGIN
  -- 1. Get Context (Company & User)
  SELECT id INTO v_company_id FROM public.companies LIMIT 1;
  SELECT id INTO v_user_id FROM public.users WHERE company_id = v_company_id LIMIT 1;

  -- 2. Get Tariffs (from previous seed)
  SELECT id INTO v_endesa_v1 FROM public.tariff_versions WHERE company_id = v_company_id AND supplier_name = 'Endesa' LIMIT 1;
  SELECT id INTO v_iberdrola_v1 FROM public.tariff_versions WHERE company_id = v_company_id AND supplier_name = 'Iberdrola' LIMIT 1;

  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE NOTICE 'No company/user found. Skipping demo data.';
    RETURN;
  END IF;

  -- 3. Create Demo Customers
  
  -- Customer 1: B2B (Active)
  INSERT INTO public.customers (company_id, cif, name, customer_type, status, city, assigned_to)
  VALUES (v_company_id, 'B98765432', 'Restaurante Fausto S.L.', 'empresa', 'cerrado', 'Madrid', v_user_id)
  RETURNING id INTO v_cust_1;

  -- Customer 2: B2C (Pending)
  INSERT INTO public.customers (company_id, cif, name, customer_type, status, city, assigned_to)
  VALUES (v_company_id, '12345678Z', 'María García López', 'particular', 'propuesta', 'Barcelona', v_user_id)
  RETURNING id INTO v_cust_2;

  -- Customer 3: B2B (Recent Signing)
  INSERT INTO public.customers (company_id, cif, name, customer_type, status, city, assigned_to)
  VALUES (v_company_id, 'A11223344', 'Industrias Metálicas SA', 'empresa', 'cerrado', 'Valencia', v_user_id)
  RETURNING id INTO v_cust_3;

  -- Customer 4: B2C (Cancelled)
  INSERT INTO public.customers (company_id, cif, name, customer_type, status, city, assigned_to)
  VALUES (v_company_id, '87654321X', 'John Smith', 'particular', 'perdido', 'Málaga', v_user_id)
  RETURNING id INTO v_cust_4;


  -- 4. Create Demo Contracts (Only if tariffs exist)
  IF v_endesa_v1 IS NOT NULL AND v_iberdrola_v1 IS NOT NULL THEN
    
    -- Contract 1: Active (Endesa)
    INSERT INTO public.contracts (
        company_id, customer_id, commercial_id, tariff_version_id, 
        contract_number, status, signed_at, activation_date, annual_value_eur, notes
    ) VALUES (
        v_company_id, v_cust_1, v_user_id, v_endesa_v1,
        'CTR-2025-001', 'active', '2025-11-15', '2025-12-01', 4500.00, 'Cliente VIP. Renovación anual.'
    );

    -- Contract 2: Signed (Iberdrola) - Just signed today
    INSERT INTO public.contracts (
        company_id, customer_id, commercial_id, tariff_version_id, 
        contract_number, status, signed_at, annual_value_eur, notes
    ) VALUES (
        v_company_id, v_cust_3, v_user_id, v_iberdrola_v1,
        'CTR-2026-104', 'signed', CURRENT_DATE, 12500.50, 'Nave industrial. Pendiente de activación.'
    );

     -- Contract 3: Pending (Endesa) - Draft
    INSERT INTO public.contracts (
        company_id, customer_id, commercial_id, tariff_version_id, 
        contract_number, status, signed_at, annual_value_eur, notes
    ) VALUES (
        v_company_id, v_cust_2, v_user_id, v_endesa_v1,
        'CTR-2026-105', 'pending', NULL, 850.00, 'Pendiente de firma digital.'
    );

     -- Contract 4: Cancelled (Iberdrola)
    INSERT INTO public.contracts (
        company_id, customer_id, commercial_id, tariff_version_id, 
        contract_number, status, signed_at, cancellation_date, annual_value_eur, notes
    ) VALUES (
        v_company_id, v_cust_4, v_user_id, v_iberdrola_v1,
        'CTR-2025-055', 'cancelled', '2025-06-01', '2025-06-10', 600.00, 'Cancelado por impago.'
    );

  END IF;

END $$;


