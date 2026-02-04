-- Migration: Create comparison and contract tables
-- Created: 2026-02-03

BEGIN;

-- ============================================================================
-- COMPARATOR DOMAIN: Comparisons, Results
-- ============================================================================

-- Comparisons
CREATE TABLE IF NOT EXISTS comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  supply_point_id UUID REFERENCES supply_points(id) ON DELETE SET NULL,
  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(50) NOT NULL DEFAULT 'client_first' CHECK (mode IN ('client_first', 'commercial_first')),
  inputs_snapshot JSONB NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comparisons_company_id ON comparisons(company_id);
CREATE INDEX idx_comparisons_customer_id ON comparisons(customer_id);
CREATE INDEX idx_comparisons_performed_by ON comparisons(performed_by);
CREATE INDEX idx_comparisons_created_at ON comparisons(created_at DESC);

ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access comparisons from their company"
  ON comparisons FOR ALL
  USING (company_id = public.get_auth_company_id());

COMMENT ON TABLE comparisons IS 'Saved comparison requests + results snapshot';
COMMENT ON COLUMN comparisons.mode IS 'client_first (optimize for customer) vs commercial_first (optimize for commission)';

-- Comparison Results
CREATE TABLE IF NOT EXISTS comparison_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  comparison_id UUID NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
  tariff_version_id UUID NOT NULL REFERENCES tariff_versions(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank > 0),
  annual_cost_eur DECIMAL(10,2) NOT NULL CHECK (annual_cost_eur >= 0),
  monthly_cost_eur DECIMAL(10,2) NOT NULL CHECK (monthly_cost_eur >= 0),
  annual_savings_eur DECIMAL(10,2),
  savings_pct DECIMAL(5,2),
  commission_eur DECIMAL(10,2) CHECK (commission_eur >= 0),
  calculation_breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comparison_results_comparison_id ON comparison_results(comparison_id);
CREATE INDEX idx_comparison_results_tariff_version_id ON comparison_results(tariff_version_id);

ALTER TABLE comparison_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access results from their company"
  ON comparison_results FOR ALL
  USING (company_id = public.get_auth_company_id());

COMMENT ON TABLE comparison_results IS 'Ranked offers with savings calculations (denormalized snapshot)';

-- ============================================================================
-- CONTRACTS DOMAIN
-- ============================================================================

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  supply_point_id UUID REFERENCES supply_points(id) ON DELETE SET NULL,
  comparison_id UUID REFERENCES comparisons(id) ON DELETE SET NULL,
  comparison_result_id UUID REFERENCES comparison_results(id) ON DELETE SET NULL,
  commercial_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tariff_version_id UUID NOT NULL REFERENCES tariff_versions(id) ON DELETE CASCADE,
  contract_number VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'active', 'cancelled', 'completed')),
  signed_at DATE,
  activation_date DATE,
  cancellation_date DATE,
  annual_value_eur DECIMAL(10,2) NOT NULL CHECK (annual_value_eur >= 0),
  commission_eur DECIMAL(10,2) CHECK (commission_eur >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_company_id ON contracts(company_id);
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_commercial_id ON contracts(commercial_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_signed_at ON contracts(signed_at DESC);

CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access contracts from their company"
  ON contracts FOR ALL
  USING (company_id = public.get_auth_company_id());

COMMENT ON TABLE contracts IS 'Signed deals from comparisons';
COMMENT ON COLUMN contracts.status IS 'pending → signed → active → cancelled/completed';

COMMIT;
