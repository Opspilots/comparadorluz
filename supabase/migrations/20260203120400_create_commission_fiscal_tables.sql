-- Migration: Create commission and fiscal tables
-- Created: 2026-02-03

BEGIN;

-- ============================================================================
-- COMMISSIONS DOMAIN: Rules, Events, Payouts
-- ============================================================================

-- Commission Rules
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_name VARCHAR(200),  -- NULL = applies to all suppliers
  tariff_type VARCHAR(50),     -- NULL = applies to all tariff types
  commission_pct DECIMAL(5,2) NOT NULL CHECK (commission_pct >= 0 AND commission_pct <= 100),
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_rules_company_id ON commission_rules(company_id);
CREATE INDEX idx_commission_rules_user_id ON commission_rules(user_id);
CREATE INDEX idx_commission_rules_active ON commission_rules(is_active) WHERE is_active = true;

ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission rules"
  ON commission_rules FOR ALL
  USING (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Commercials can view their own rules"
  ON commission_rules FOR SELECT
  USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

COMMENT ON TABLE commission_rules IS 'Percentage per commercial, optionally by supplier/tariff type';
COMMENT ON COLUMN commission_rules.supplier_name IS 'NULL = default rule for all suppliers';

-- Commission Events
CREATE TABLE IF NOT EXISTS commission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commission_rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'paid', 'reverted')),
  amount_eur DECIMAL(10,2) NOT NULL CHECK (amount_eur >= 0),
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  period_month DATE NOT NULL,  -- YYYY-MM-01 format
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_events_company_id ON commission_events(company_id);
CREATE INDEX idx_commission_events_contract_id ON commission_events(contract_id);
CREATE INDEX idx_commission_events_user_id ON commission_events(user_id);
CREATE INDEX idx_commission_events_status ON commission_events(status);
CREATE INDEX idx_commission_events_period ON commission_events(period_month DESC);

CREATE TRIGGER set_commission_events_updated_at
  BEFORE UPDATE ON commission_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission events"
  ON commission_events FOR ALL
  USING (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Commercials can view their own events"
  ON commission_events FOR SELECT
  USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

COMMENT ON TABLE commission_events IS 'Individual commission entries';
COMMENT ON COLUMN commission_events.status IS 'pending → validated → paid → reverted';

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,  -- YYYY-MM-01 format
  total_amount_eur DECIMAL(10,2) NOT NULL CHECK (total_amount_eur >= 0),
  event_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'paid')),
  generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, period_month)
);

CREATE INDEX idx_payouts_company_id ON payouts(company_id);
CREATE INDEX idx_payouts_user_id ON payouts(user_id);
CREATE INDEX idx_payouts_period ON payouts(period_month DESC);
CREATE INDEX idx_payouts_status ON payouts(status);

CREATE TRIGGER set_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payouts"
  ON payouts FOR ALL
  USING (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Commercials can view their own payouts"
  ON payouts FOR SELECT
  USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

COMMENT ON TABLE payouts IS 'Monthly settlements';

-- ============================================================================
-- FISCAL DOMAIN: Exports, Lines
-- ============================================================================

-- Fiscal Exports
CREATE TABLE IF NOT EXISTS fiscal_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('vat_report', 'payment_report', 'contract_summary')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path TEXT,
  line_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fiscal_exports_company_id ON fiscal_exports(company_id);
CREATE INDEX idx_fiscal_exports_type ON fiscal_exports(export_type);
CREATE INDEX idx_fiscal_exports_period ON fiscal_exports(period_start, period_end);

ALTER TABLE fiscal_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fiscal exports"
  ON fiscal_exports FOR ALL
  USING (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

COMMENT ON TABLE fiscal_exports IS 'Generated reports (VAT, payments)';

-- Fiscal Lines
CREATE TABLE IF NOT EXISTS fiscal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  export_id UUID NOT NULL REFERENCES fiscal_exports(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  line_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fiscal_lines_export_id ON fiscal_lines(export_id);

ALTER TABLE fiscal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fiscal lines"
  ON fiscal_lines FOR ALL
  USING (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

COMMIT;
