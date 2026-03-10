-- Unify electricity_market_prices into market_prices
-- The old table used indicator_id + valid_from, the new one uses price_date + hour + price_type + geo_id
-- Create a view so any legacy queries against electricity_market_prices still work
BEGIN;

-- Migrate existing data from electricity_market_prices → market_prices (if any)
INSERT INTO market_prices (price_date, hour, price_type, price_eur_mwh, geo_id, source, indicator_id)
SELECT
    (valid_from AT TIME ZONE 'Europe/Madrid')::date AS price_date,
    EXTRACT(HOUR FROM valid_from AT TIME ZONE 'Europe/Madrid')::smallint AS hour,
    CASE
        WHEN indicator_id IN (600, 601) THEN 'pvpc'
        WHEN indicator_id IN (1001) THEN 'pool'
        ELSE 'other'
    END AS price_type,
    price AS price_eur_mwh,
    'peninsular' AS geo_id,
    'esios' AS source,
    indicator_id
FROM electricity_market_prices
ON CONFLICT (price_date, hour, price_type, geo_id) DO NOTHING;

-- Drop the old table (no frontend code uses it, only legacy sync-electricity-prices edge function)
DROP TABLE IF EXISTS electricity_market_prices CASCADE;

-- Create a compatibility view so the legacy edge function doesn't break
CREATE OR REPLACE VIEW electricity_market_prices AS
SELECT
    id,
    indicator_id,
    NULL::varchar(255) AS indicator_name,
    price_eur_mwh AS price,
    'EUR/MWh'::varchar(50) AS unit,
    (price_date + (hour || ' hours')::interval) AT TIME ZONE 'Europe/Madrid' AS valid_from,
    NULL::timestamptz AS valid_to,
    created_at
FROM market_prices;

COMMIT;
