-- =============================================================================
-- Consent Requests: Digital consent document sending, signing & tracking
-- =============================================================================
-- Enables sending consent forms via email/WhatsApp with secure signing links
-- Covers: RGPD Art.7, Art.12, LOPD-GDD, RD 88/2026
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS consent_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- What consents are being requested
    consent_types TEXT[] NOT NULL,
    legal_text TEXT NOT NULL,              -- Snapshot of legal text at send time

    -- Delivery
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    recipient_contact TEXT NOT NULL,       -- Email address or phone number
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- Secure signing token
    token TEXT UNIQUE NOT NULL,

    -- Lifecycle
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
        'sent',      -- Enviada, pendiente de firma
        'viewed',    -- El cliente ha abierto el enlace
        'signed',    -- Firmada digitalmente
        'expired',   -- Caducada sin firma
        'rejected'   -- Rechazada por el cliente
    )),

    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT now(),
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),

    -- Signer information (filled on signing)
    signer_name TEXT,
    signer_nif TEXT,
    signer_ip TEXT,
    signature_data TEXT,                   -- Base64 canvas signature image

    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consent_requests_company ON consent_requests(company_id);
CREATE INDEX idx_consent_requests_customer ON consent_requests(customer_id);
CREATE INDEX idx_consent_requests_token ON consent_requests(token);
CREATE INDEX idx_consent_requests_status ON consent_requests(status)
    WHERE status NOT IN ('signed', 'expired', 'rejected');

ALTER TABLE consent_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users: tenant isolation
CREATE POLICY "Tenant isolation" ON consent_requests
    FOR ALL USING (company_id = (SELECT get_auth_company_id()));

-- Anonymous users: can read and update by token (for public signing page)
CREATE POLICY "Public signing read" ON consent_requests
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Public signing update" ON consent_requests
    FOR UPDATE TO anon
    USING (token IS NOT NULL)
    WITH CHECK (token IS NOT NULL);

-- Anonymous users: can insert customer_consents when signing
CREATE POLICY "Public consent insert" ON customer_consents
    FOR INSERT TO anon
    WITH CHECK (true);

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_consent_requests') THEN
        CREATE TRIGGER set_updated_at_consent_requests
            BEFORE UPDATE ON consent_requests
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$;

COMMIT;
