BEGIN;

-- ============================================================================
-- integration_providers: global catalog of available energy providers
-- No company_id — this is platform-wide configuration
-- ============================================================================
CREATE TABLE integration_providers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    logo_url    TEXT,
    auth_type   VARCHAR(32) NOT NULL CHECK (auth_type IN ('api_key', 'oauth2', 'basic_auth')),
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    docs_url    TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed known Spanish energy providers
INSERT INTO integration_providers (slug, display_name, auth_type, capabilities, is_active) VALUES
    ('gana-energia',  'Gana Energía',  'api_key',    ARRAY['quote','contract_submit','status_check'], true),
    ('iberdrola',     'Iberdrola',     'basic_auth', ARRAY['quote','status_check','consumption'],      true),
    ('endesa',        'Endesa',        'api_key',    ARRAY['quote','contract_submit','switching'],     true),
    ('naturgy',       'Naturgy',       'oauth2',     ARRAY['quote','contract_submit','status_check'], true),
    ('repsol',        'Repsol',        'api_key',    ARRAY['quote','switching'],                       true),
    ('holaluz',       'Holaluz',       'api_key',    ARRAY['quote','contract_submit'],                 true),
    ('podo',          'Podo',          'api_key',    ARRAY['quote','contract_submit','status_check'], true),
    ('octopus',       'Octopus Energy','api_key',    ARRAY['quote','contract_submit','consumption'],  true);

-- ============================================================================
-- integrations: per-tenant connection to a provider
-- ============================================================================
CREATE TABLE integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    provider_id     UUID NOT NULL REFERENCES integration_providers(id) ON DELETE RESTRICT,
    status          VARCHAR(32) NOT NULL DEFAULT 'inactive'
                        CHECK (status IN ('inactive','connecting','active','error','expired')),
    credentials     JSONB,           -- encrypted at rest by Supabase Vault ideally; stored as JSON map
    agent_config    JSONB NOT NULL DEFAULT '{}',
    last_sync_at    TIMESTAMPTZ,
    last_error      TEXT,
    sync_enabled    BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT integrations_company_provider_unique UNIQUE (company_id, provider_id)
);

-- RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_integrations"
    ON integrations FOR SELECT
    USING (company_id = public.get_auth_company_id());

CREATE POLICY "company_admins_can_manage_integrations"
    ON integrations FOR ALL
    USING (company_id = public.get_auth_company_id());

-- updated_at trigger
CREATE TRIGGER set_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_integrations_company_id ON integrations(company_id);
CREATE INDEX idx_integrations_provider_id ON integrations(provider_id);
CREATE INDEX idx_integrations_status ON integrations(status);

-- ============================================================================
-- integration_events: inbound webhook events from providers
-- ============================================================================
CREATE TABLE integration_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    integration_id  UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    event_type      VARCHAR(128) NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}',
    contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    cups            VARCHAR(64),
    processed       BOOLEAN NOT NULL DEFAULT false,
    processed_at    TIMESTAMPTZ,
    error           TEXT,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_integration_events"
    ON integration_events FOR SELECT
    USING (company_id = public.get_auth_company_id());

CREATE POLICY "company_members_can_insert_integration_events"
    ON integration_events FOR INSERT
    WITH CHECK (company_id = public.get_auth_company_id());

-- Indexes
CREATE INDEX idx_integration_events_company_id ON integration_events(company_id);
CREATE INDEX idx_integration_events_integration_id ON integration_events(integration_id);
CREATE INDEX idx_integration_events_received_at ON integration_events(received_at DESC);
CREATE INDEX idx_integration_events_processed ON integration_events(processed) WHERE processed = false;

COMMIT;
