BEGIN;

-- Link contracts to the integration that submitted them externally.
-- contract_number already stores the external provider ID.
-- This column tracks which integration submitted the contract.

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_integration_id
    ON contracts(integration_id);

COMMIT;
