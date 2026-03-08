BEGIN;

-- Add switching tracking columns to contracts
ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS switching_status TEXT CHECK (switching_status IN ('requested', 'in_progress', 'completed', 'rejected')),
    ADD COLUMN IF NOT EXISTS switching_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Index for switching status queries
CREATE INDEX IF NOT EXISTS idx_contracts_switching_status
    ON contracts (company_id, switching_status)
    WHERE switching_status IS NOT NULL;

COMMIT;
