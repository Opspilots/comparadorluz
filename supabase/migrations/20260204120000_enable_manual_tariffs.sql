-- Migration: Enable manual tariff management
-- Description: Makes batch_id nullable to allow creating tariffs without a file upload batch
-- Created: 2026-02-04

BEGIN;

-- 1. Modify tariff_versions to make batch_id nullable
ALTER TABLE tariff_versions 
ALTER COLUMN batch_id DROP NOT NULL;

-- 2. Add comment to explain the change
COMMENT ON COLUMN tariff_versions.batch_id IS 'Link to upload batch (NULL for manually created tariffs)';

-- 3. Verify RLS policies (just to be safe, though existing ones likely cover it)
-- Existing Insert Policy: "Admins and managers can manage tariffs"
-- CHECK (company_id = public.get_auth_company_id() AND EXISTS (... role IN ('admin', 'manager')))
-- This does NOT check batch_id, so it should work fine for NULL values.

COMMIT;
