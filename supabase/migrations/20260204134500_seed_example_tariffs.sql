-- Migration: Seed example tariffs for Spanish market
-- Purpose: Populate system with realistic tariff data for demo/testing
-- Author: CRM System
-- Date: 2026-02-04

DO $$
DECLARE
    v_company_id UUID := 'c54d3d80-6cf3-49bb-863e-6ad9baebc40b';
    v_iberdrola_id UUID := '7e263b3f-20d6-46c0-b2da-129195289a42';
    v_endesa_id UUID := '1b927a8c-ff1e-4f3c-a6fa-a462a4db16d3';
    v_naturgy_id UUID := 'f17e303a-185f-4186-8c41-fa8e20c4a671';
    v_total_id UUID := '935e49f0-aa86-40d4-8cdd-8e42aba38038';
    v_holaluz_id UUID := '5a08f834-ff72-43cd-a8ed-e50564431889';
    v_tariff_id UUID;
BEGIN
    -- DELETE existing seed data if any (optional cleanup)
    -- DELETE FROM tariff_versions WHERE company_id = v_company_id AND tariff_code LIKE 'SEED%';

    -- 1. IBERDROLA - Plan Online (2.0TD)
    INSERT INTO tariff_versions (
        company_id, supplier_id, tariff_name, tariff_code, tariff_type, valid_from, is_active, batch_id
    ) VALUES (
        v_company_id, v_iberdrola_id, 'Plan Online', 'SEED-IBE-001', '2.0TD', NOW(), true, NULL
    ) RETURNING id INTO v_tariff_id;

    INSERT INTO tariff_components (company_id, tariff_version_id, component_type, period, price_eur_kwh, price_eur_kw_year, fixed_price_eur_month) VALUES
        (v_company_id, v_tariff_id, 'energy_price', 'P1', 0.165, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P2', 0.142, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P3', 0.118, NULL, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P1', NULL, 34.2, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P2', NULL, 12.5, NULL);

    -- 2. ENDESA - Conecta (2.0TD)
    INSERT INTO tariff_versions (
        company_id, supplier_id, tariff_name, tariff_code, tariff_type, valid_from, is_active, batch_id
    ) VALUES (
        v_company_id, v_endesa_id, 'Tarifa Conecta', 'SEED-END-001', '2.0TD', NOW(), true, NULL
    ) RETURNING id INTO v_tariff_id;

    INSERT INTO tariff_components (company_id, tariff_version_id, component_type, period, price_eur_kwh, price_eur_kw_year, fixed_price_eur_month) VALUES
        (v_company_id, v_tariff_id, 'energy_price', 'P1', 0.150, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P2', 0.150, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P3', 0.150, NULL, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P1', NULL, 35.0, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P2', NULL, 10.0, NULL);

    -- 3. NATURGY - Por Uso (2.0TD)
    INSERT INTO tariff_versions (
        company_id, supplier_id, tariff_name, tariff_code, tariff_type, valid_from, is_active, batch_id
    ) VALUES (
        v_company_id, v_naturgy_id, 'Tarifa Por Uso', 'SEED-NAT-001', '2.0TD', NOW(), true, NULL
    ) RETURNING id INTO v_tariff_id;

    INSERT INTO tariff_components (company_id, tariff_version_id, component_type, period, price_eur_kwh, price_eur_kw_year, fixed_price_eur_month) VALUES
        (v_company_id, v_tariff_id, 'energy_price', 'P1', 0.170, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P2', 0.130, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P3', 0.110, NULL, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P1', NULL, 32.5, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P2', NULL, 9.8, NULL);

    -- 4. TOTALENERGIES - A Tu Aire (3.0TD - Empresa)
    INSERT INTO tariff_versions (
        company_id, supplier_id, tariff_name, tariff_code, tariff_type, valid_from, is_active, batch_id
    ) VALUES (
        v_company_id, v_total_id, 'A Tu Aire Empresa', 'SEED-TOT-001', '3.0TD', NOW(), true, NULL
    ) RETURNING id INTO v_tariff_id;

    INSERT INTO tariff_components (company_id, tariff_version_id, component_type, period, price_eur_kwh, price_eur_kw_year, fixed_price_eur_month) VALUES
        (v_company_id, v_tariff_id, 'energy_price', 'P1', 0.210, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P2', 0.190, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P3', 0.170, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P4', 0.150, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P5', 0.130, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P6', 0.110, NULL, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P1', NULL, 40.0, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P2', NULL, 35.0, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P3', NULL, 20.0, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P4', NULL, 15.0, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P5', NULL, 10.0, NULL),
        (v_company_id, v_tariff_id, 'power_price', 'P6', NULL, 5.0, NULL);

    -- 5. HOLALUZ - Justa (2.0TD) - Indexada (simulado precio fijo para ejemplo)
    INSERT INTO tariff_versions (
        company_id, supplier_id, tariff_name, tariff_code, tariff_type, valid_from, is_active, batch_id
    ) VALUES (
        v_company_id, v_holaluz_id, 'Tarifa Justa', 'SEED-HOL-001', '2.0TD', NOW(), true, NULL
    ) RETURNING id INTO v_tariff_id;

    INSERT INTO tariff_components (company_id, tariff_version_id, component_type, period, price_eur_kwh, price_eur_kw_year, fixed_price_eur_month) VALUES
        (v_company_id, v_tariff_id, 'fixed_fee', NULL, NULL, NULL, 19.95), -- Cuota fija mensual ejemplo
        (v_company_id, v_tariff_id, 'energy_price', 'P1', 0.12, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P2', 0.12, NULL, NULL),
        (v_company_id, v_tariff_id, 'energy_price', 'P3', 0.12, NULL, NULL);

END $$;
