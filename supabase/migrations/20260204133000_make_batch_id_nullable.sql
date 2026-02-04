-- Migration: Make batch_id nullable in tariff_versions
-- Purpose: Allow manual creation of tariffs without a batch upload
-- Author: CRM System
-- Date: 2026-02-04

ALTER TABLE tariff_versions
ALTER COLUMN batch_id DROP NOT NULL;

-- Add comment explaining why
COMMENT ON COLUMN tariff_versions.batch_id IS 'Link to original upload batch. Null for manually created tariffs.';
