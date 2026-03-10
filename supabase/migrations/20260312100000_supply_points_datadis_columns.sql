-- Add Datadis-related columns to supply_points and unique constraint for upsert
BEGIN;

-- New columns for Datadis supply data
ALTER TABLE supply_points
  ADD COLUMN IF NOT EXISTS supply_type VARCHAR(20) DEFAULT 'electricity',
  ADD COLUMN IF NOT EXISTS distributor VARCHAR(200),
  ADD COLUMN IF NOT EXISTS point_type INTEGER,
  ADD COLUMN IF NOT EXISTS max_demand_kw DECIMAL(8,2);

-- Unique constraint on (company_id, cups) for upsert from Datadis
-- Only one supply point per CUPS per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_supply_points_company_cups
  ON supply_points(company_id, cups)
  WHERE cups IS NOT NULL;

COMMENT ON COLUMN supply_points.supply_type IS 'electricity or gas';
COMMENT ON COLUMN supply_points.distributor IS 'Distribution company name from Datadis';
COMMENT ON COLUMN supply_points.point_type IS 'Datadis point type code';
COMMENT ON COLUMN supply_points.max_demand_kw IS 'Maximum recorded demand in kW from Datadis';

COMMIT;
