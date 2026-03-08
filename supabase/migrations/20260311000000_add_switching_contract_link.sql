BEGIN;

-- Link new contract to the original contract it's replacing (switching/traspaso)
ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS switching_from_contract_id UUID REFERENCES contracts(id),
    ADD COLUMN IF NOT EXISTS switching_notes TEXT,
    ADD COLUMN IF NOT EXISTS switching_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS estimated_activation_date DATE;

-- Index for finding linked contracts
CREATE INDEX IF NOT EXISTS idx_contracts_switching_from
    ON contracts (switching_from_contract_id)
    WHERE switching_from_contract_id IS NOT NULL;

COMMIT;
