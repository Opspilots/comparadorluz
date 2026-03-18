-- Migration: Create suppliers table and seed Spanish energy companies
-- Purpose: Establish fixed list of Spanish electricity suppliers
-- Author: CRM System
-- Date: 2026-02-04

BEGIN;

-- ===========================================================================
-- 1. CREATE SUPPLIERS TABLE
-- ===========================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    website TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_green BOOLEAN NOT NULL DEFAULT false,
    market_share_pct DECIMAL(5,2),
    parent_group VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, slug)
);

-- Add indexes
CREATE INDEX idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX idx_suppliers_slug ON suppliers(slug);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

-- Add comments
COMMENT ON TABLE suppliers IS 'Master table of electricity suppliers (comercializadoras)';
COMMENT ON COLUMN suppliers.slug IS 'URL-friendly identifier';
COMMENT ON COLUMN suppliers.is_green IS 'True if supplier offers 100% renewable energy';
COMMENT ON COLUMN suppliers.market_share_pct IS 'Market share percentage (if known)';

-- ===========================================================================
-- 2. ROW LEVEL SECURITY
-- ===========================================================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Allow users to read suppliers from their company
CREATE POLICY suppliers_select_policy ON suppliers
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Allow admins and managers to insert suppliers
CREATE POLICY suppliers_insert_policy ON suppliers
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Allow admins and managers to update suppliers
CREATE POLICY suppliers_update_policy ON suppliers
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Allow admins to delete suppliers
CREATE POLICY suppliers_delete_policy ON suppliers
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ===========================================================================
-- 3. SEED SPANISH ENERGY SUPPLIERS
-- ===========================================================================

-- This function will seed suppliers for all existing companies
DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        -- Insert Spanish energy suppliers for each company
        INSERT INTO suppliers (company_id, name, slug, website, is_green, market_share_pct, parent_group) VALUES
            -- Top 5 (Los 5 Grandes)
            (company_record.id, 'Iberdrola', 'iberdrola', 'https://www.iberdrola.es', false, 27.30, null),
            (company_record.id, 'Endesa', 'endesa', 'https://www.endesa.com', false, null, null),
            (company_record.id, 'Naturgy', 'naturgy', 'https://www.naturgy.es', false, null, null),
            (company_record.id, 'Repsol', 'repsol', 'https://www.repsol.es', false, null, null),
            (company_record.id, 'TotalEnergies', 'totalenergies', 'https://www.totalenergies.es', false, null, null),
            
            -- Alternative suppliers (ordered by relevance)
            (company_record.id, 'EDP España', 'edp', 'https://www.edp.com/es', true, null, 'EDP Group'),
            (company_record.id, 'Holaluz', 'holaluz', 'https://www.holaluz.com', true, null, null),
            (company_record.id, 'Factor Energía', 'factor-energia', 'https://www.factorenergia.com', true, null, null),
            (company_record.id, 'Octopus Energy', 'octopus-energy', 'https://octopusenergy.es', true, null, 'Octopus Energy Group'),
            (company_record.id, 'Podo', 'podo', 'https://www.mipodo.com', false, null, null),
            (company_record.id, 'Audax Renovables', 'audax', 'https://www.audaxrenovables.com', true, null, null),
            (company_record.id, 'Disa Luz y Gas', 'disa', 'https://www.disaluzygas.es', false, null, 'Grupo Disa'),
            (company_record.id, 'EnérgyaVM', 'energyavm', 'https://www.energyavm.es', false, null, null),
            (company_record.id, 'Visalia', 'visalia', 'https://www.visalia.es', false, null, null),
            (company_record.id, 'Niba', 'niba', 'https://www.nibenergia.com', false, null, null)
        ON CONFLICT (company_id, slug) DO NOTHING;
    END LOOP;
END $$;

-- ===========================================================================
-- 4. UPDATE TRIGGER
-- ===========================================================================

CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suppliers_updated_at_trigger
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

COMMIT;
