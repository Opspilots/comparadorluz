-- Migration: Add sidebar_color column to companies table
-- The branding migration (20260316200000) created secondary_color but
-- the UI uses sidebar_color. Add the missing column.

BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sidebar_color VARCHAR(7) DEFAULT '#0f172a';

COMMENT ON COLUMN companies.sidebar_color IS 'Hex color code for sidebar background (#RRGGBB)';

COMMIT;
