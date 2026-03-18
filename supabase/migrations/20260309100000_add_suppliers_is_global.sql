BEGIN;

-- Add missing is_global column to suppliers table
-- Required by seed_default_suppliers function (20260310000000)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT false;

COMMIT;
