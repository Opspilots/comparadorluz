BEGIN;

-- ============================================================================
-- Add fields to track the client's CURRENT tariff when a contract is created
-- from a comparison. This represents the "FROM" side of a tariff switch.
-- ============================================================================

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS origin_supplier_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS origin_tariff_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS origin_annual_cost_eur NUMERIC(12,2);

COMMENT ON COLUMN contracts.origin_supplier_name IS 'Comercializadora actual del cliente al crear el contrato';
COMMENT ON COLUMN contracts.origin_tariff_name IS 'Tarifa actual del cliente al crear el contrato';
COMMENT ON COLUMN contracts.origin_annual_cost_eur IS 'Coste anual actual del cliente al crear el contrato';

COMMIT;
