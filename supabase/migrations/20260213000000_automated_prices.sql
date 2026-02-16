-- Migration: Support for automated tariff updates
-- Date: 2026-02-13

BEGIN;

-- 1. Table for Market Prices (Pool, PVPC)
CREATE TABLE IF NOT EXISTS public.electricity_market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id INTEGER NOT NULL, -- ESIOS Indicator ID (1013, 1014, 1015, 1021)
  indicator_name VARCHAR(255),
  price NUMERIC NOT NULL,
  unit VARCHAR(50) DEFAULT 'EUR/MWh',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (indicator_id, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_market_prices_indicator ON public.electricity_market_prices(indicator_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_date ON public.electricity_market_prices(valid_from DESC);

-- 2. Add Automation fields to tariff_versions
ALTER TABLE public.tariff_versions 
  ADD COLUMN IF NOT EXISTS is_automated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS automation_source VARCHAR(100), -- 'esios', 'cnmc'
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 3. Update tariff_rates to support indexing
ALTER TABLE public.tariff_rates
  ADD COLUMN IF NOT EXISTS index_type VARCHAR(50), -- 'POOL', 'PVPC'
  ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0; -- Profit margin for indexed tariffs

-- 4. RLS for new table
ALTER TABLE public.electricity_market_prices ENABLE ROW LEVEL SECURITY;

-- Policy creation (using DO block for safety)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'electricity_market_prices' 
        AND policyname = 'Public read for market prices'
    ) THEN
        CREATE POLICY "Public read for market prices"
          ON public.electricity_market_prices FOR SELECT
          USING (true);
    END IF;
END $$;

COMMIT;
