-- Migration: Add contract_duration to tariff components and rates
-- Date: 2026-02-18

BEGIN;

-- 1. Add contract_duration to tariff_components (legacy/current active table)
ALTER TABLE tariff_components 
ADD COLUMN IF NOT EXISTS contract_duration SMALLINT; -- 12, 24, etc. NULL means "Any"

COMMENT ON COLUMN tariff_components.contract_duration IS 'Contract duration in months. NULL applies to any duration.';

-- 2. Add contract_duration to tariff_rates (new table)
ALTER TABLE tariff_rates 
ADD COLUMN IF NOT EXISTS contract_duration SMALLINT;

COMMENT ON COLUMN tariff_rates.contract_duration IS 'Contract duration in months. NULL applies to any duration.';

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tariff_components_duration ON tariff_components(tariff_version_id, contract_duration);
CREATE INDEX IF NOT EXISTS idx_tariff_rates_duration ON tariff_rates(tariff_version_id, contract_duration);

COMMIT;
