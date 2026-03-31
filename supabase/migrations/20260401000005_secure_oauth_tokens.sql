-- Migration: Move OAuth tokens from companies.messaging_settings to a dedicated secure table
-- Reason: refresh tokens stored in JSONB were readable by any user in the company via RLS on companies.
-- The new table restricts access to admin/manager roles only.

BEGIN;

-- 1. Create secure table for OAuth tokens
CREATE TABLE IF NOT EXISTS company_oauth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    provider TEXT NOT NULL DEFAULT 'google',
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE company_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies — admin/manager of the same company only
CREATE POLICY "company_oauth_tokens_select"
    ON company_oauth_tokens FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

CREATE POLICY "company_oauth_tokens_insert"
    ON company_oauth_tokens FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

CREATE POLICY "company_oauth_tokens_update"
    ON company_oauth_tokens FOR UPDATE
    TO authenticated
    USING (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    )
    WITH CHECK (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

CREATE POLICY "company_oauth_tokens_delete"
    ON company_oauth_tokens FOR DELETE
    TO authenticated
    USING (
        company_id = public.get_auth_company_id()
        AND public.get_auth_user_role() IN ('admin', 'manager')
    );

-- 4. Index on company_id (UNIQUE constraint already creates one, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_company_oauth_tokens_company_id
    ON company_oauth_tokens(company_id);

-- 5. updated_at trigger
CREATE TRIGGER set_company_oauth_tokens_updated_at
    BEFORE UPDATE ON company_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Migrate existing tokens from companies.messaging_settings
INSERT INTO company_oauth_tokens (company_id, provider, refresh_token, access_token, email)
SELECT
    c.id,
    'google',
    c.messaging_settings->>'google_refresh_token',
    c.messaging_settings->>'google_access_token',
    c.messaging_settings->>'email_from'
FROM companies c
WHERE c.messaging_settings->>'google_refresh_token' IS NOT NULL
    AND c.messaging_settings->>'google_refresh_token' != ''
ON CONFLICT (company_id) DO UPDATE SET
    refresh_token = EXCLUDED.refresh_token,
    access_token = EXCLUDED.access_token,
    email = EXCLUDED.email,
    updated_at = now();

-- 7. Remove sensitive token fields from messaging_settings (keep whatsapp fields)
UPDATE companies
SET messaging_settings = messaging_settings - 'google_refresh_token' - 'google_access_token'
WHERE messaging_settings ? 'google_refresh_token'
   OR messaging_settings ? 'google_access_token';

COMMIT;
