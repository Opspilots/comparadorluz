-- Add contract_duration column to tariff_versions
ALTER TABLE tariff_versions 
ADD COLUMN IF NOT EXISTS contract_duration SMALLINT;

COMMENT ON COLUMN tariff_versions.contract_duration IS 'Duration of the contract in months (e.g., 12, 24, 36)';
