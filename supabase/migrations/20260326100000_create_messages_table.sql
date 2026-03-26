-- Migration: Create messages table
-- Required by: send-message, webhook-whatsapp, webhook-email, sync-gmail edge functions
-- This table was referenced by multiple edge functions and the provider_unique migration
-- but was never actually created.

BEGIN;

-- ============================================================================
-- MESSAGES TABLE
-- Stores all inbound/outbound messages across channels (email, whatsapp, sms)
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    recipient_contact TEXT,          -- Email address or phone number
    subject TEXT,                     -- Email subject line (NULL for WhatsApp/SMS)
    content TEXT,                     -- Plain text or message body
    html_content TEXT,                -- HTML version of the message (emails)
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'failed', 'read')),
    provider_id TEXT,                 -- External ID from Gmail/WhatsApp/Resend
    sent_at TIMESTAMPTZ DEFAULT now(),
    attachments JSONB DEFAULT '[]'::jsonb,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS 'Multi-channel messaging: email, WhatsApp, SMS — inbound and outbound';
COMMENT ON COLUMN messages.provider_id IS 'External message ID from the channel provider (Gmail, WhatsApp, etc.)';
COMMENT ON COLUMN messages.recipient_contact IS 'Email address or phone number of the recipient/sender';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: all messages for a company
CREATE INDEX idx_messages_company_id ON messages(company_id);

-- Customer conversation history
CREATE INDEX idx_messages_customer_id ON messages(customer_id);

-- Campaign analytics
CREATE INDEX idx_messages_campaign_id ON messages(campaign_id);

-- Deduplication: prevent duplicate imports from Gmail sync and WhatsApp webhooks
-- Partial unique index — only enforces when provider_id is NOT NULL
CREATE UNIQUE INDEX idx_messages_provider_company_unique
    ON messages (provider_id, company_id)
    WHERE provider_id IS NOT NULL;

-- Chronological ordering within a company
CREATE INDEX idx_messages_company_created ON messages(company_id, created_at DESC);

-- Channel filtering
CREATE INDEX idx_messages_channel ON messages(company_id, channel);

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE TRIGGER set_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only view messages from their own company
CREATE POLICY "messages_select_company_isolation"
    ON messages FOR SELECT
    USING (company_id = public.get_auth_company_id());

-- INSERT: Users can only insert messages for their own company
CREATE POLICY "messages_insert_company_isolation"
    ON messages FOR INSERT
    WITH CHECK (company_id = public.get_auth_company_id());

-- UPDATE: Users can only update messages from their own company
CREATE POLICY "messages_update_company_isolation"
    ON messages FOR UPDATE
    USING (company_id = public.get_auth_company_id())
    WITH CHECK (company_id = public.get_auth_company_id());

-- DELETE: Users can only delete messages from their own company
CREATE POLICY "messages_delete_company_isolation"
    ON messages FOR DELETE
    USING (company_id = public.get_auth_company_id());

COMMIT;
