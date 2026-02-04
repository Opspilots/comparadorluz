-- Migration: Fix seed data company_id and cascade delete
-- Purpose: Assign seed tariffs to active user company and enable cascade delete
-- Author: CRM System
-- Date: 2026-02-04

-- 1. FIX SEED DATA OWNERSHIP
-- Update the seeded tariffs to belong to the active company found in previous query
UPDATE tariff_versions
SET company_id = '4eaa780b-a2cf-4000-8a72-4ab0b4bbb6a1'
WHERE company_id = 'c54d3d80-6cf3-49bb-863e-6ad9baebc40b';

-- Also need to update the related suppliers if they were created with wrong company_id
UPDATE suppliers
SET company_id = '4eaa780b-a2cf-4000-8a72-4ab0b4bbb6a1'
WHERE company_id = 'c54d3d80-6cf3-49bb-863e-6ad9baebc40b';

UPDATE tariff_components
SET company_id = '4eaa780b-a2cf-4000-8a72-4ab0b4bbb6a1'
WHERE company_id = 'c54d3d80-6cf3-49bb-863e-6ad9baebc40b';

-- 2. ENABLE CASCADE DELETE
-- First drop existing constraint if exists
ALTER TABLE tariff_components
DROP CONSTRAINT IF EXISTS tariff_components_tariff_version_id_fkey;

-- Re-add with CASCADE DELETE
ALTER TABLE tariff_components
ADD CONSTRAINT tariff_components_tariff_version_id_fkey
FOREIGN KEY (tariff_version_id)
REFERENCES tariff_versions(id)
ON DELETE CASCADE;
