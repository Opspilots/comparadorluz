-- Migration: Create tariff engine tables
-- Created: 2026-02-03

BEGIN;

-- ============================================================================
-- TARIFF ENGINE DOMAIN: Batches, Files, Versions, Components
-- ============================================================================

-- Tariff Batches
CREATE TABLE IF NOT EXISTS tariff_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'validation_failed', 'pending_review', 'published')),
  file_count INTEGER NOT NULL DEFAULT 0,
  validation_errors JSONB,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tariff_batches_company_id ON tariff_batches(company_id);
CREATE INDEX idx_tariff_batches_status ON tariff_batches(status);
CREATE INDEX idx_tariff_batches_created_at ON tariff_batches(created_at DESC);

CREATE TRIGGER set_tariff_batches_updated_at
  BEFORE UPDATE ON tariff_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tariff_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage batches"
  ON tariff_batches FOR ALL
  USING (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

COMMENT ON TABLE tariff_batches IS 'Upload sessions for tariff updates (every ~15 days)';
COMMENT ON COLUMN tariff_batches.status IS 'uploaded → processing → validation_failed/pending_review → published';

-- Tariff Files
CREATE TABLE IF NOT EXISTS tariff_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES tariff_batches(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  extraction_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data JSONB,
  extraction_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tariff_files_company_id ON tariff_files(company_id);
CREATE INDEX idx_tariff_files_batch_id ON tariff_files(batch_id);

ALTER TABLE tariff_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage files"
  ON tariff_files FOR ALL
  USING (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Tariff Versions
CREATE TABLE IF NOT EXISTS tariff_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES tariff_batches(id) ON DELETE CASCADE,
  file_id UUID REFERENCES tariff_files(id) ON DELETE SET NULL,
  supplier_name VARCHAR(200) NOT NULL,
  tariff_name VARCHAR(200) NOT NULL,
  tariff_code VARCHAR(100),
  tariff_type VARCHAR(50) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, supplier_name, tariff_name, valid_from)
);

CREATE INDEX idx_tariff_versions_company_id ON tariff_versions(company_id);
CREATE INDEX idx_tariff_versions_active ON tariff_versions(is_active) WHERE is_active = true;
CREATE INDEX idx_tariff_versions_validity ON tariff_versions(valid_from, valid_to);
CREATE INDEX idx_tariff_versions_supplier ON tariff_versions(supplier_name);

CREATE TRIGGER set_tariff_versions_updated_at
  BEFORE UPDATE ON tariff_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tariff_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can read active tariffs"
  ON tariff_versions FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Admins and managers can manage tariffs"
  ON tariff_versions FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

COMMENT ON TABLE tariff_versions IS 'Versioned tariff data (immutable, time-scoped)';
COMMENT ON COLUMN tariff_versions.valid_from IS 'Start date of validity';
COMMENT ON COLUMN tariff_versions.valid_to IS 'End date (NULL = currently active)';

-- Tariff Components
CREATE TABLE IF NOT EXISTS tariff_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tariff_version_id UUID NOT NULL REFERENCES tariff_versions(id) ON DELETE CASCADE,
  component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('energy_price', 'power_price', 'fixed_fee', 'tax', 'discount')),
  period VARCHAR(50),  -- P1, P2, P3, etc.
  price_eur_kwh DECIMAL(10,6) CHECK (price_eur_kwh >= 0),
  price_eur_kw_year DECIMAL(10,2) CHECK (price_eur_kw_year >= 0),
  fixed_price_eur_month DECIMAL(10,2) CHECK (fixed_price_eur_month >= 0),
  tax_pct DECIMAL(5,2) CHECK (tax_pct >= 0 AND tax_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tariff_components_version_id ON tariff_components(tariff_version_id);
CREATE INDEX idx_tariff_components_type ON tariff_components(component_type);

ALTER TABLE tariff_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read tariff components"
  ON tariff_components FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Admins and managers can manage components"
  ON tariff_components FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

COMMENT ON TABLE tariff_components IS 'Price components (energy, power, taxes, discounts)';

COMMIT;
