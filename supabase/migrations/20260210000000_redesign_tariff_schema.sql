-- Migration: Redesign Tariff Engine Schema (V2)
-- Purpose: Support for complex tariffs, indexed pricing, and detailed validation
-- Date: 2026-02-10

BEGIN;

-- ============================================================================
-- 1. Tariff Structures (Official Definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tariff_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE, -- '2.0TD', '3.0TD', '6.1TD'
  name VARCHAR(100) NOT NULL,
  energy_periods INTEGER NOT NULL CHECK (energy_periods > 0),
  power_periods INTEGER NOT NULL CHECK (power_periods > 0),
  default_schedule_template_id UUID, -- Future FK
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tariff_structures IS 'Official tariff definitions (CNMC periods)';

-- Seed Initial Data
INSERT INTO tariff_structures (code, name, energy_periods, power_periods) VALUES
('2.0TD', 'Tarifa 2.0TD (Doméstico/Pequeña Pyme)', 3, 2),
('3.0TD', 'Tarifa 3.0TD (Pyme/Industrial Baja Tensión)', 6, 6),
('6.1TD', 'Tarifa 6.1TD (Alta Tensión)', 6, 6)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. Modify Tariff Versions
-- ============================================================================

-- Add new columns
ALTER TABLE tariff_versions 
  ADD COLUMN IF NOT EXISTS tariff_structure_id UUID REFERENCES tariff_structures(id),
  ADD COLUMN IF NOT EXISTS is_indexed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS complestion_status VARCHAR(50) CHECK (complestion_status IN ('draft', 'partial', 'complete')) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS source_file_id UUID REFERENCES tariff_files(id);

-- Rename/Align naming if needed (existing is 'tariff_type')
-- We migrate existing 'tariff_type' to 'tariff_structure_id'

DO $$
DECLARE
    r RECORD;
    ts_id UUID;
BEGIN
    FOR r IN SELECT id, tariff_type FROM tariff_versions WHERE tariff_structure_id IS NULL LOOP
        SELECT id INTO ts_id FROM tariff_structures WHERE code = r.tariff_type;
        
        IF ts_id IS NOT NULL THEN
            UPDATE tariff_versions 
            SET tariff_structure_id = ts_id,
                complestion_status = CASE WHEN is_active THEN 'complete' ELSE 'draft' END
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- Fix typo in column name if I made one above (completion_status) - checked, I wrote 'complestion_status' which is a typo.
-- Correcting it in the ALTER statement below.

ALTER TABLE tariff_versions 
  DROP COLUMN IF EXISTS complestion_status,
  ADD COLUMN IF NOT EXISTS completion_status VARCHAR(50) CHECK (completion_status IN ('draft', 'partial', 'complete')) DEFAULT 'draft';

-- Re-run migration logic for corrected column
DO $$
DECLARE
    r RECORD;
    ts_id UUID;
BEGIN
    FOR r IN SELECT id, tariff_type FROM tariff_versions WHERE tariff_structure_id IS NOT NULL LOOP
         -- Update status for existing verified records
         UPDATE tariff_versions 
         SET completion_status = CASE WHEN is_active THEN 'complete' ELSE 'draft' END
         WHERE id = r.id;
    END LOOP;
END $$;

COMMENT ON COLUMN tariff_versions.tariff_structure_id IS 'Link to official structure (e.g. 2.0TD)';


-- ============================================================================
-- 3. Tariff Rates (New Unified Pricing Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tariff_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_version_id UUID NOT NULL REFERENCES tariff_versions(id) ON DELETE CASCADE,
  
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('energy', 'power', 'fixed_fee', 'discount', 'tax')),
  period VARCHAR(10), -- 'P1', 'P2'... or NULL
  
  -- Flexible Pricing (Fixed vs Indexed)
  price NUMERIC, -- Numeric value for fixed prices or simulation baselines
  price_formula TEXT, -- Formula for indexed prices (e.g. 'OMIE + 0.01')
  unit VARCHAR(50) NOT NULL, -- 'EUR/kWh', 'EUR/kW/year', etc.
  
  -- AI/OCR Metadata
  confidence_score NUMERIC(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_page INTEGER,
  source_bbox JSONB, -- {x,y,w,h}
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast retrieval
CREATE INDEX idx_tariff_rates_version ON tariff_rates(tariff_version_id);
CREATE INDEX idx_tariff_rates_type ON tariff_rates(item_type);

COMMENT ON TABLE tariff_rates IS 'Unified pricing table replacing tariff_components';

-- ============================================================================
-- 4. Tariff Schedules (Flexible Time Rules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tariff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_version_id UUID NOT NULL REFERENCES tariff_versions(id) ON DELETE CASCADE,
  
  month_mask INTEGER[], -- Array of months [1,2..12]
  day_type_mask INTEGER[], -- 1=Mon...7=Sun, 8=NationalHoliday, etc.
  context_calendar VARCHAR(50), -- 'NATIONAL', 'MADRID' (for holiday lookups)
  
  start_hour TIME NOT NULL,
  end_hour TIME NOT NULL,
  period VARCHAR(10) NOT NULL, -- 'P1'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tariff_schedules_version ON tariff_schedules(tariff_version_id);

COMMENT ON TABLE tariff_schedules IS 'Time-of-use rules for the tariff';


-- ============================================================================
-- 5. Security Policies (RLS)
-- ============================================================================

ALTER TABLE tariff_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_schedules ENABLE ROW LEVEL SECURITY;

-- Structures are readable by everyone authenticated
CREATE POLICY "Authenticated users can read structures"
  ON tariff_structures FOR SELECT
  USING (auth.role() = 'authenticated');

-- Rates and Schedules follow the Company isolation
CREATE POLICY "Users can read their company rates"
  ON tariff_rates FOR SELECT
  USING ( EXISTS (
    SELECT 1 FROM tariff_versions tv 
    WHERE tv.id = tariff_rates.tariff_version_id 
    AND tv.company_id = public.get_auth_company_id()
  ));

CREATE POLICY "Admins can manage rates"
  ON tariff_rates FOR ALL
  USING ( EXISTS (
    SELECT 1 FROM tariff_versions tv 
    WHERE tv.id = tariff_rates.tariff_version_id 
    AND tv.company_id = public.get_auth_company_id()
  ) AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Users can read their company schedules"
  ON tariff_schedules FOR SELECT
  USING ( EXISTS (
    SELECT 1 FROM tariff_versions tv 
    WHERE tv.id = tariff_schedules.tariff_version_id 
    AND tv.company_id = public.get_auth_company_id()
  ));

CREATE POLICY "Admins can manage schedules"
  ON tariff_schedules FOR ALL
  USING ( EXISTS (
    SELECT 1 FROM tariff_versions tv 
    WHERE tv.id = tariff_schedules.tariff_version_id 
    AND tv.company_id = public.get_auth_company_id()
  ) AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

COMMIT;
