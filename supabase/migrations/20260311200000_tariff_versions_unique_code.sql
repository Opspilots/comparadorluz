-- Unique index for upsert support when syncing tariffs from integrations
CREATE UNIQUE INDEX IF NOT EXISTS tariff_versions_company_code_unique
ON tariff_versions (company_id, tariff_code)
WHERE tariff_code IS NOT NULL;
