-- Add commission fields to tariff_versions
-- commission_type: 'percentage' (% of annual cost) or 'fixed' (EUR flat amount)
-- commission_value: the numeric value (e.g. 10 for 10%, or 150 for 150€)

BEGIN;

ALTER TABLE tariff_versions
  ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage'
    CHECK (commission_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN tariff_versions.commission_type IS 'Type of commission: percentage (% of annual cost) or fixed (EUR amount)';
COMMENT ON COLUMN tariff_versions.commission_value IS 'Commission value: percentage points or EUR amount depending on commission_type';

COMMIT;
