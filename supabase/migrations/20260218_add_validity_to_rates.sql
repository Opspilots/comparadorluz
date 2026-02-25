-- Migration: Add validity dates to tariff pricing tables
-- Date: 2026-02-18
-- Purpose: Support period-based price validity (e.g., monthly, bi-weekly price updates)

BEGIN;

-- 1. Add valid_from/valid_to to tariff_rates
ALTER TABLE tariff_rates
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_to DATE;

COMMENT ON COLUMN tariff_rates.valid_from IS 'Start date of price validity. NULL means inherited from tariff_version.';
COMMENT ON COLUMN tariff_rates.valid_to IS 'End date of price validity. NULL means no expiry.';

-- 2. Add valid_from/valid_to to tariff_components
ALTER TABLE tariff_components
  ADD COLUMN IF NOT EXISTS valid_from DATE,
  ADD COLUMN IF NOT EXISTS valid_to DATE;

COMMENT ON COLUMN tariff_components.valid_from IS 'Start date of price validity. NULL means inherited from tariff_version.';
COMMENT ON COLUMN tariff_components.valid_to IS 'End date of price validity. NULL means no expiry.';

-- 3. Create indexes for date-range lookups
CREATE INDEX IF NOT EXISTS idx_tariff_rates_validity
  ON tariff_rates(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_tariff_components_validity
  ON tariff_components(valid_from, valid_to);

COMMIT;
