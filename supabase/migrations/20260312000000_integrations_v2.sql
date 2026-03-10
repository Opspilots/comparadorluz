BEGIN;

-- ============================================================================
-- 1. Add integration_mode to integration_providers
-- ============================================================================
ALTER TABLE integration_providers
    ADD COLUMN IF NOT EXISTS integration_mode VARCHAR(32) NOT NULL DEFAULT 'api'
        CHECK (integration_mode IN ('api', 'data_platform'));

-- Allow auth_type 'none' (for public APIs like Octopus, REE)
ALTER TABLE integration_providers DROP CONSTRAINT IF EXISTS integration_providers_auth_type_check;
ALTER TABLE integration_providers
    ADD CONSTRAINT integration_providers_auth_type_check
        CHECK (auth_type IN ('api_key', 'oauth2', 'basic_auth', 'none'));

-- Add portal_url for manual integrations (link to provider portal)
ALTER TABLE integration_providers
    ADD COLUMN IF NOT EXISTS portal_url TEXT;

-- Add description field
ALTER TABLE integration_providers
    ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- 2. Remove providers without public API (no integration possible)
--    First delete any integrations referencing them, then the providers.
-- ============================================================================
DELETE FROM integration_events
    WHERE integration_id IN (
        SELECT i.id FROM integrations i
        JOIN integration_providers p ON p.id = i.provider_id
        WHERE p.slug IN ('gana-energia','iberdrola','endesa','naturgy','repsol','holaluz','podo')
    );

DELETE FROM integrations
    WHERE provider_id IN (
        SELECT id FROM integration_providers
        WHERE slug IN ('gana-energia','iberdrola','endesa','naturgy','repsol','holaluz','podo')
    );

DELETE FROM integration_providers
    WHERE slug IN ('gana-energia','iberdrola','endesa','naturgy','repsol','holaluz','podo');

-- ============================================================================
-- 3. Update Octopus Energy: auth_type = none (public API), mode = api
-- ============================================================================
UPDATE integration_providers SET
    integration_mode = 'api',
    auth_type = 'none',
    capabilities = ARRAY['quote', 'consumption'],
    docs_url = 'https://docs.octopus.energy/rest/guides/api-basics/',
    description = 'API pública REST + GraphQL. Tarifas y precios en tiempo real sin credenciales.'
WHERE slug = 'octopus';

-- ============================================================================
-- 4. Insert new data platform providers
-- ============================================================================
INSERT INTO integration_providers (slug, display_name, auth_type, capabilities, integration_mode, docs_url, description, is_active)
VALUES
    (
        'datadis',
        'Datadis',
        'basic_auth',
        ARRAY['consumption'],
        'data_platform',
        'https://datadis.es/home',
        'Plataforma de datos de distribuidoras españolas. Accede a consumos reales, potencia maxima y datos contractuales de cualquier CUPS.'
    , true),
    (
        'ree-esios',
        'REE e-sios',
        'api_key',
        ARRAY['quote'],
        'data_platform',
        'https://www.esios.ree.es/es/pagina/api',
        'API de Red Electrica de España. Precios PVPC horarios, datos de mercado electrico y generacion en tiempo real.'
    , true),
    (
        'ree-redata',
        'REE REData',
        'none',
        ARRAY['quote'],
        'data_platform',
        'https://www.ree.es/en/datos/apidata',
        'API publica de REData. Demanda, generacion y balance energetico sin autenticacion.'
    , true),
    (
        'cnmc',
        'CNMC Data',
        'none',
        ARRAY['quote'],
        'data_platform',
        'https://data.cnmc.es/reutilizadores',
        'Portal de datos de la CNMC. Ofertas de comercializadoras, estadisticas del mercado energetico español.'
    , true)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    auth_type = EXCLUDED.auth_type,
    capabilities = EXCLUDED.capabilities,
    integration_mode = EXCLUDED.integration_mode,
    docs_url = EXCLUDED.docs_url,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 5. Create consumption_data table
-- ============================================================================
CREATE TABLE IF NOT EXISTS consumption_data (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cups            VARCHAR(64) NOT NULL,
    date            DATE NOT NULL,
    hour            SMALLINT,  -- 0-23, NULL for gas or daily aggregates
    consumption_kwh NUMERIC(10,3) NOT NULL,
    source          VARCHAR(32) NOT NULL DEFAULT 'datadis',
    period          VARCHAR(8),  -- P1, P2, P3 (discriminacion horaria)
    method          VARCHAR(32), -- real, estimated, profiled
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT consumption_data_cups_date_hour_source_unique
        UNIQUE(company_id, cups, date, hour, source)
);

ALTER TABLE consumption_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_consumption"
    ON consumption_data FOR SELECT
    USING (company_id = public.get_auth_company_id());

CREATE POLICY "company_members_can_insert_consumption"
    ON consumption_data FOR INSERT
    WITH CHECK (company_id = public.get_auth_company_id());

CREATE INDEX idx_consumption_data_company_cups ON consumption_data(company_id, cups);
CREATE INDEX idx_consumption_data_date ON consumption_data(date DESC);
CREATE INDEX idx_consumption_data_cups_date ON consumption_data(cups, date DESC);

-- ============================================================================
-- 6. Create market_prices table
-- ============================================================================
CREATE TABLE IF NOT EXISTS market_prices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_date      DATE NOT NULL,
    hour            SMALLINT NOT NULL CHECK (hour >= 0 AND hour <= 23),
    price_type      VARCHAR(32) NOT NULL,  -- pvpc, pool, adjustment, generation
    price_eur_mwh   NUMERIC(10,4) NOT NULL,
    geo_id          VARCHAR(32) NOT NULL DEFAULT 'peninsular',
    source          VARCHAR(32) NOT NULL,  -- esios, redata, cnmc
    indicator_id    INTEGER,               -- e-sios indicator number (600 = PVPC)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT market_prices_date_hour_type_geo_unique
        UNIQUE(price_date, hour, price_type, geo_id)
);

-- market_prices is global data, no company_id needed — public read
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_market_prices"
    ON market_prices FOR SELECT
    USING (true);

CREATE POLICY "service_role_can_insert_market_prices"
    ON market_prices FOR INSERT
    WITH CHECK (true);

CREATE INDEX idx_market_prices_date ON market_prices(price_date DESC);
CREATE INDEX idx_market_prices_type_date ON market_prices(price_type, price_date DESC);
CREATE INDEX idx_market_prices_indicator ON market_prices(indicator_id, price_date DESC);

COMMIT;
