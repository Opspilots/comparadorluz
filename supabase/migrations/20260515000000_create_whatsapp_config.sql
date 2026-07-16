BEGIN;

CREATE TABLE IF NOT EXISTS company_whatsapp_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    waba_id TEXT,
    verified_name TEXT,
    display_phone_number TEXT,
    quality_rating TEXT DEFAULT 'GREEN',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE company_whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_config_select" ON company_whatsapp_config FOR SELECT TO authenticated
    USING (company_id = public.get_auth_company_id() AND public.get_auth_user_role() IN ('admin', 'manager'));

CREATE POLICY "whatsapp_config_insert" ON company_whatsapp_config FOR INSERT TO authenticated
    WITH CHECK (company_id = public.get_auth_company_id() AND public.get_auth_user_role() IN ('admin', 'manager'));

CREATE POLICY "whatsapp_config_update" ON company_whatsapp_config FOR UPDATE TO authenticated
    USING (company_id = public.get_auth_company_id() AND public.get_auth_user_role() IN ('admin', 'manager'))
    WITH CHECK (company_id = public.get_auth_company_id() AND public.get_auth_user_role() IN ('admin', 'manager'));

CREATE POLICY "whatsapp_config_delete" ON company_whatsapp_config FOR DELETE TO authenticated
    USING (company_id = public.get_auth_company_id() AND public.get_auth_user_role() IN ('admin', 'manager'));

CREATE INDEX IF NOT EXISTS idx_company_whatsapp_config_company_id ON company_whatsapp_config(company_id);

CREATE TRIGGER set_whatsapp_config_updated_at
    BEFORE UPDATE ON company_whatsapp_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
