-- Migration: Fix tariff_versions unique constraint to support durations and supply types
-- Date: 2026-02-24

BEGIN;

-- 1. Drop the existing unique constraint
ALTER TABLE tariff_versions
DROP CONSTRAINT IF EXISTS tariff_versions_unique_per_company;

-- 2. Create the new unique constraint
-- We use a UNIQUE index with COALESCE for nullable fields like contract_duration 
-- and valid_from to ensure Postgres correctly differentiates nulls as unique groupings.
-- Note: A standard UNIQUE constraint considers two NULLs as strictly distinct, but 
-- using an index with COALESCE allows us to define "null duration" as its own specific tier.

CREATE UNIQUE INDEX IF NOT EXISTS tariff_versions_unique_per_company_idx 
ON tariff_versions (
  company_id, 
  supplier_id, 
  tariff_structure_id, 
  LOWER(tariff_name), 
  valid_from,
  COALESCE(contract_duration, -1) -- we use -1 to represent 'Indefinida/Cualquiera' for uniqueness
);

-- Note: We used a UNIQUE INDEX instead of an ALTER TABLE ADD CONSTRAINT because
-- standard constraints cannot use expressions like LOWER() or COALESCE() cleanly without
-- generated columns. PostgREST allows upserts against unique indexes matching the where clause.

COMMIT;
