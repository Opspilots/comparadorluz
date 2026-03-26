-- Migration: Create public.set_updated_at() trigger function
-- Several migrations reference this function but it was never created:
--   - 20260303140000_add_contract_templates.sql
--   - 20260305120000_create_integrations.sql
--   - 20260314000000_regulatory_compliance.sql
--   - 20260314100000_risk_scoring_training_sips.sql
--   - 20260315000000_consent_requests.sql
--   - 20260319200000_fix_saved_comparisons_multitenant.sql
-- This is functionally identical to update_updated_at_column() from the core migration.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_updated_at() IS 'Alias for update_updated_at_column() — auto-sets updated_at on row update';

COMMIT;
