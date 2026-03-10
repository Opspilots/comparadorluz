-- =============================================================================
-- Medium Priority: Risk Scoring, Agent Training, SIPS Integration
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Customer Risk Scoring
-- ---------------------------------------------------------------------------
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
    ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS risk_updated_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. Agent Training & Certifications (CNMC Jan 2025 requirement)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    commissioner_id UUID NOT NULL REFERENCES commissioners(id) ON DELETE CASCADE,
    certification_type TEXT NOT NULL CHECK (certification_type IN (
        'cnmc_commercial_practices', -- Prácticas comerciales CNMC
        'data_protection',           -- Protección de datos (RGPD/LOPD)
        'energy_market',             -- Mercado energético español
        'switching_procedures',      -- Procedimientos de cambio (ATR)
        'consumer_rights',           -- Derechos del consumidor
        'product_knowledge',         -- Conocimiento de productos/tarifas
        'custom'                     -- Formación personalizada
    )),
    title TEXT NOT NULL,
    description TEXT,
    issued_at DATE NOT NULL,
    expires_at DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    issuer TEXT,                      -- Quién emite (empresa, organismo)
    evidence_url TEXT,                -- URL documento/certificado
    score INT,                        -- Puntuación examen (0-100)
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_certs_company ON agent_certifications(company_id);
CREATE INDEX idx_agent_certs_commissioner ON agent_certifications(commissioner_id);
CREATE INDEX idx_agent_certs_expiry ON agent_certifications(expires_at) WHERE status = 'active';

ALTER TABLE agent_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON agent_certifications
    FOR ALL USING (company_id = (SELECT get_auth_company_id()));

-- Training compliance status on commissioners
ALTER TABLE commissioners
    ADD COLUMN IF NOT EXISTS training_compliant BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS training_checked_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. SIPS data columns on supply points
-- ---------------------------------------------------------------------------
ALTER TABLE supply_points
    ADD COLUMN IF NOT EXISTS sips_imported_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sips_data JSONB,
    ADD COLUMN IF NOT EXISTS contracted_power_p1_kw NUMERIC,
    ADD COLUMN IF NOT EXISTS contracted_power_p2_kw NUMERIC,
    ADD COLUMN IF NOT EXISTS contracted_power_p3_kw NUMERIC,
    ADD COLUMN IF NOT EXISTS contracted_power_p4_kw NUMERIC,
    ADD COLUMN IF NOT EXISTS contracted_power_p5_kw NUMERIC,
    ADD COLUMN IF NOT EXISTS contracted_power_p6_kw NUMERIC,
    ADD COLUMN IF NOT EXISTS last_meter_reading_date DATE,
    ADD COLUMN IF NOT EXISTS meter_type TEXT,
    ADD COLUMN IF NOT EXISTS voltage_level TEXT,
    ADD COLUMN IF NOT EXISTS connection_date DATE;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_agent_certifications') THEN
        CREATE TRIGGER set_updated_at_agent_certifications
            BEFORE UPDATE ON agent_certifications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

COMMIT;
