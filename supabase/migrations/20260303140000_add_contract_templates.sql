BEGIN;

-- Contract template customization per company
CREATE TABLE contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Colors
    primary_color VARCHAR(7) NOT NULL DEFAULT '#2563eb',
    accent_color VARCHAR(7) NOT NULL DEFAULT '#f59e0b',
    text_color VARCHAR(7) NOT NULL DEFAULT '#111827',
    section_bg_color VARCHAR(7) NOT NULL DEFAULT '#f9fafb',
    notes_bg_color VARCHAR(7) NOT NULL DEFAULT '#fffbeb',
    notes_border_color VARCHAR(7) NOT NULL DEFAULT '#f59e0b',

    -- Header
    contract_title VARCHAR(200) NOT NULL DEFAULT 'CONTRATO DE SUMINISTRO',
    company_name VARCHAR(200) NOT NULL DEFAULT 'ENERGY DEAL',
    company_tagline VARCHAR(300),
    company_logo_url TEXT,

    -- Footer
    footer_text TEXT NOT NULL DEFAULT 'Documento generado a través de CRM Luz. Este documento tiene carácter informativo y contractual una vez firmado.',
    footer_show_date BOOLEAN NOT NULL DEFAULT true,
    footer_show_page_number BOOLEAN NOT NULL DEFAULT true,

    -- Typography & layout
    font_size_base SMALLINT NOT NULL DEFAULT 10,
    page_padding SMALLINT NOT NULL DEFAULT 40,

    -- Legal
    custom_legal_text TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT contract_templates_company_id_unique UNIQUE (company_id)
);

-- RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_members_can_view_template"
    ON contract_templates FOR SELECT
    USING (company_id = public.get_auth_company_id());

CREATE POLICY "company_admins_can_manage_template"
    ON contract_templates FOR ALL
    USING (company_id = public.get_auth_company_id());

-- updated_at trigger
CREATE TRIGGER set_contract_templates_updated_at
    BEFORE UPDATE ON contract_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Index
CREATE INDEX idx_contract_templates_company_id ON contract_templates(company_id);

COMMIT;
