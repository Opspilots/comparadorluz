-- =============================================================================
-- Regulatory Compliance: Consent Management, ARCO+ Rights, Bono Social,
-- Data Retention, and Switching Deadline (21 days)
-- =============================================================================
-- Covers: RGPD Art.7, LOPD-GDD, RD 88/2026, RD 1011/2009, RD 897/2017
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Customer Consents (RGPD Art.7 + RD 88/2026)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN (
        'data_processing',        -- Tratamiento de datos personales
        'commercial_contact',     -- Contacto comercial (RD 88/2026)
        'switching_authorization',-- Autorización de cambio de comercializador
        'data_sharing',           -- Cesión de datos a terceros
        'marketing'               -- Comunicaciones comerciales
    )),
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    granted_by TEXT,              -- user_id or 'customer_self'
    method TEXT CHECK (method IN ('written', 'digital', 'verbal_recorded', 'checkbox')),
    evidence_url TEXT,            -- link to signed document or recording
    ip_address TEXT,
    notes TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customer_consents_customer ON customer_consents(customer_id);
CREATE INDEX idx_customer_consents_company ON customer_consents(company_id);
CREATE UNIQUE INDEX idx_customer_consents_unique ON customer_consents(company_id, customer_id, consent_type)
    WHERE revoked_at IS NULL;

ALTER TABLE customer_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON customer_consents
    FOR ALL USING (company_id = (SELECT get_auth_company_id()));

-- ---------------------------------------------------------------------------
-- 2. ARCO+ Data Subject Requests (RGPD Arts. 15-22)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL CHECK (request_type IN (
        'access',          -- Derecho de acceso
        'rectification',   -- Derecho de rectificación
        'erasure',         -- Derecho de supresión
        'restriction',     -- Derecho de limitación
        'portability',     -- Derecho de portabilidad
        'objection'        -- Derecho de oposición
    )),
    requester_name TEXT NOT NULL,
    requester_email TEXT,
    requester_nif TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',        -- Recibida
        'in_progress',    -- En tramitación
        'completed',      -- Resuelta
        'rejected',       -- Denegada (con justificación)
        'extended'        -- Plazo ampliado (+2 meses)
    )),
    description TEXT,
    response_notes TEXT,
    deadline_at TIMESTAMPTZ NOT NULL, -- 1 month from request
    extended_deadline_at TIMESTAMPTZ, -- +2 months if complex
    completed_at TIMESTAMPTZ,
    handled_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dsr_company ON data_subject_requests(company_id);
CREATE INDEX idx_dsr_status ON data_subject_requests(status);
CREATE INDEX idx_dsr_deadline ON data_subject_requests(deadline_at) WHERE status NOT IN ('completed', 'rejected');

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON data_subject_requests
    FOR ALL USING (company_id = (SELECT get_auth_company_id()));

-- ---------------------------------------------------------------------------
-- 3. Bono Social flag on supply points (RD 897/2017)
-- ---------------------------------------------------------------------------
ALTER TABLE supply_points
    ADD COLUMN IF NOT EXISTS has_bono_social BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS bono_social_verified_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 4. Switching deadline tracking (RD 1011/2009 — max 21 days)
-- ---------------------------------------------------------------------------
ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS switching_deadline_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS switching_deadline_warning_sent BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------------
-- 5. Data Retention Policies (RGPD Art. 5.1.e)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    data_category TEXT NOT NULL CHECK (data_category IN (
        'customer_data',       -- Datos de clientes
        'consumption_data',    -- Datos de consumo
        'contract_data',       -- Datos contractuales
        'comparison_data',     -- Datos de comparaciones
        'message_data',        -- Mensajes y comunicaciones
        'audit_logs'           -- Registros de auditoría
    )),
    retention_months INT NOT NULL DEFAULT 60, -- 5 years default
    legal_basis TEXT,                         -- Justificación legal
    auto_delete BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_drp_unique ON data_retention_policies(company_id, data_category);

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON data_retention_policies
    FOR ALL USING (company_id = (SELECT get_auth_company_id()));

-- ---------------------------------------------------------------------------
-- Triggers for updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_customer_consents') THEN
        CREATE TRIGGER set_updated_at_customer_consents
            BEFORE UPDATE ON customer_consents
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_data_subject_requests') THEN
        CREATE TRIGGER set_updated_at_data_subject_requests
            BEFORE UPDATE ON data_subject_requests
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_data_retention_policies') THEN
        CREATE TRIGGER set_updated_at_data_retention_policies
            BEFORE UPDATE ON data_retention_policies
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

COMMIT;
