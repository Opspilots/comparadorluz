-- Migration: Relink tariffs to correct company suppliers
-- Purpose: Fix tariffs pointing to seed suppliers instead of active company suppliers
-- Author: CRM System
-- Date: 2026-02-04

DO $$
DECLARE
    v_target_company_id UUID := '4eaa780b-a2cf-4000-8a72-4ab0b4bbb6a1';
BEGIN
    -- Update tariff versions to point to the supplier in the SAME company that has the SAME slug
    -- as the currently linked supplier.
    UPDATE tariff_versions tv
    SET supplier_id = correct_s.id
    FROM suppliers current_s
    JOIN suppliers correct_s ON correct_s.slug = current_s.slug AND correct_s.company_id = v_target_company_id
    WHERE tv.supplier_id = current_s.id
    AND tv.company_id = v_target_company_id
    AND current_s.company_id != v_target_company_id;  -- Only fix if pointing to wrong company supplier

END $$;
