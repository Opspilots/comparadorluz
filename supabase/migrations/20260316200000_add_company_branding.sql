-- Migration: Add branding columns to companies table
-- Purpose: Allow companies to customize logo and primary color

BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#10b981';

COMMENT ON COLUMN companies.logo_url IS 'URL to company logo in Supabase Storage';
COMMENT ON COLUMN companies.primary_color IS 'Hex color code for brand primary (#RRGGBB)';
COMMENT ON COLUMN companies.secondary_color IS 'Hex color code for brand secondary (#RRGGBB)';

COMMIT;
