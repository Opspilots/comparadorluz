-- Migration: Sync tariff components ownership
-- Purpose: Ensure all components belong to the same company as their parent tariff
-- Author: CRM System
-- Date: 2026-02-04

UPDATE tariff_components tc
SET company_id = tv.company_id
FROM tariff_versions tv
WHERE tc.tariff_version_id = tv.id
AND tc.company_id != tv.company_id;
