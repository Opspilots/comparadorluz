-- Migration: Add new electricity suppliers (Galp, Eleia, CYE)
-- Date: 2026-02-28

DO $$
DECLARE
    company_record RECORD;
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        INSERT INTO suppliers (company_id, name, slug, website, is_active, is_green, market_share_pct, parent_group) VALUES
            (company_record.id, 'Galp', 'galp', 'https://www.galp.es', true, false, null, 'Galp Energia'),
            (company_record.id, 'Eleia', 'eleia', 'https://www.eleiaenergia.com', true, false, null, null),
            (company_record.id, 'CYE', 'cye', 'https://www.cyeenergia.com', true, false, null, null)
        ON CONFLICT (company_id, slug) DO UPDATE SET is_active = true;
    END LOOP;
END $$;
