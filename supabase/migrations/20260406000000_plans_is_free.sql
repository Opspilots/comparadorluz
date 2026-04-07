BEGIN;

-- Add is_free flag to plans (used by webhook to find fallback plan)
DO $$ BEGIN
    ALTER TABLE plans ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

UPDATE plans SET is_free = true WHERE name = 'free';

COMMIT;
