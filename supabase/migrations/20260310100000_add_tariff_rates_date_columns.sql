BEGIN;

-- Add missing columns to tariff_rates for per-rate date scoping and contract duration
ALTER TABLE tariff_rates
  ADD COLUMN IF NOT EXISTS contract_duration INTEGER,
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_to DATE;

-- Add contract_duration to tariff_versions if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tariff_versions' AND column_name = 'contract_duration'
  ) THEN
    ALTER TABLE tariff_versions ADD COLUMN contract_duration INTEGER;
  END IF;
END $$;

-- Create index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_tariff_rates_validity
  ON tariff_rates (tariff_version_id, item_type, period, valid_from, valid_to);

COMMIT;
