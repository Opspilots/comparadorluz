-- Migration: Migrate tariff_versions to use supplier_id
-- Purpose: Replace supplier_name (text) with supplier_id (FK to suppliers)
-- Author: CRM System
-- Date: 2026-02-04

-- ===========================================================================
-- 1. ADD SUPPLIER_ID COLUMN
-- ===========================================================================

ALTER TABLE tariff_versions 
ADD COLUMN supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT;

-- Add index
CREATE INDEX idx_tariff_versions_supplier_id ON tariff_versions(supplier_id);

-- ===========================================================================
-- 2. MIGRATE EXISTING DATA
-- ===========================================================================

-- Attempt to match existing supplier_name values to suppliers table
-- This is best-effort matching based on similarity

DO $$
DECLARE
    tariff_record RECORD;
    matched_supplier_id UUID;
    company_id_var UUID;
BEGIN
    FOR tariff_record IN SELECT id, supplier_name, company_id FROM tariff_versions WHERE supplier_id IS NULL LOOP
        company_id_var := tariff_record.company_id;
        
        -- Try exact match first (case insensitive)
        SELECT id INTO matched_supplier_id
        FROM suppliers
        WHERE company_id = company_id_var
        AND LOWER(name) = LOWER(tariff_record.supplier_name)
        LIMIT 1;
        
        -- If no exact match, try partial match
        IF matched_supplier_id IS NULL THEN
            SELECT id INTO matched_supplier_id
            FROM suppliers
            WHERE company_id = company_id_var
            AND (
                LOWER(name) LIKE '%' || LOWER(tariff_record.supplier_name) || '%'
                OR LOWER(tariff_record.supplier_name) LIKE '%' || LOWER(name) || '%'
            )
            LIMIT 1;
        END IF;
        
        -- If still no match, create a new supplier entry
        IF matched_supplier_id IS NULL THEN
            INSERT INTO suppliers (company_id, name, slug, is_active)
            VALUES (
                company_id_var,
                tariff_record.supplier_name,
                LOWER(REGEXP_REPLACE(tariff_record.supplier_name, '[^a-zA-Z0-9]+', '-', 'g')),
                true
            )
            RETURNING id INTO matched_supplier_id;
        END IF;
        
        -- Update the tariff_version with the matched/created supplier_id
        UPDATE tariff_versions
        SET supplier_id = matched_supplier_id
        WHERE id = tariff_record.id;
    END LOOP;
END $$;

-- ===========================================================================
-- 3. MAKE SUPPLIER_ID NOT NULL
-- ===========================================================================

-- Now that all records have supplier_id, make it required
ALTER TABLE tariff_versions 
ALTER COLUMN supplier_id SET NOT NULL;

-- ===========================================================================
-- 4. DROP OLD SUPPLIER_NAME COLUMN
-- ===========================================================================

ALTER TABLE tariff_versions 
DROP COLUMN supplier_name;

-- ===========================================================================
-- 5. UPDATE UNIQUE CONSTRAINT
-- ===========================================================================

-- Drop old constraint that included supplier_name
ALTER TABLE tariff_versions
DROP CONSTRAINT IF EXISTS tariff_versions_company_id_supplier_name_tariff_name_valid_key;

-- Add new constraint with supplier_id
ALTER TABLE tariff_versions
ADD CONSTRAINT tariff_versions_unique_per_company 
UNIQUE (company_id, supplier_id, tariff_name, valid_from);

-- Add comment
COMMENT ON COLUMN tariff_versions.supplier_id IS 'Foreign key to suppliers table - replaces supplier_name';
