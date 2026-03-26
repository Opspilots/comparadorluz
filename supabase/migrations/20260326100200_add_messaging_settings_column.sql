-- Migration: Add messaging_settings JSONB column to companies
-- Required by: send-message (reads Google/WhatsApp credentials), sync-gmail (reads google_refresh_token)
-- Stores per-company messaging provider configuration:
--   - google_refresh_token: OAuth refresh token for Gmail API
--   - email_from: Sender email address for outbound emails
--   - whatsapp_token: WhatsApp Business API token
--   - whatsapp_phone_number_id: WhatsApp Business phone number ID

BEGIN;

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS messaging_settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN companies.messaging_settings IS 'Per-company messaging config: Gmail OAuth, WhatsApp credentials, email settings';

COMMIT;
