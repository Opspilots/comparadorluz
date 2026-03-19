-- Add UNIQUE constraint on (provider_id, company_id) for messages table
-- Prevents duplicate message imports from Gmail sync and WhatsApp webhooks

BEGIN;

-- Create unique index (handles NULLs gracefully — only enforces when provider_id is NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_provider_company_unique
    ON messages (provider_id, company_id)
    WHERE provider_id IS NOT NULL;

COMMIT;
