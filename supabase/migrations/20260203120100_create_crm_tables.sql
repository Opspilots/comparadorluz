-- Migration: Create CRM tables
-- Created: 2026-02-03

BEGIN;

-- ============================================================================
-- CRM DOMAIN: Customers, Contacts, Supply Points, Activities
-- ============================================================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cif VARCHAR(9) NOT NULL CHECK (cif ~ '^[A-Z][0-9]{8}$'),
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(100),
  employee_count INTEGER CHECK (employee_count > 0),
  annual_revenue DECIMAL(12,2) CHECK (annual_revenue >= 0),
  website VARCHAR(255),
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  province VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'prospecto' CHECK (status IN ('prospecto', 'contactado', 'calificado', 'propuesta', 'negociacion', 'cerrado', 'perdido')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, cif)
);

CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_cif ON customers(cif);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_assigned_to ON customers(assigned_to);

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access customers from their company"
  ON customers FOR ALL
  USING (company_id = public.get_auth_company_id());

COMMENT ON TABLE customers IS 'B2B companies (identified by CIF)';
COMMENT ON COLUMN customers.status IS 'Lead workflow: prospecto → contactado → calificado → propuesta → negociacion → cerrado/perdido';

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  position VARCHAR(100),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX idx_contacts_email ON contacts(email);

CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access contacts from their company"
  ON contacts FOR ALL
  USING (company_id = public.get_auth_company_id());

-- Supply Points
CREATE TABLE IF NOT EXISTS supply_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  cups VARCHAR(22),  -- Universal Supply Point Code
  address TEXT NOT NULL,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  province VARCHAR(100),
  annual_consumption_kwh DECIMAL(12,2) CHECK (annual_consumption_kwh >= 0),
  contracted_power_kw DECIMAL(8,2) CHECK (contracted_power_kw > 0),
  current_supplier VARCHAR(200),
  current_tariff_name VARCHAR(200),
  tariff_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supply_points_company_id ON supply_points(company_id);
CREATE INDEX idx_supply_points_customer_id ON supply_points(customer_id);
CREATE INDEX idx_supply_points_cups ON supply_points(cups);

CREATE TRIGGER set_supply_points_updated_at
  BEFORE UPDATE ON supply_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE supply_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access supply points from their company"
  ON supply_points FOR ALL
  USING (company_id = public.get_auth_company_id());

COMMENT ON TABLE supply_points IS 'Physical locations with energy meters';
COMMENT ON COLUMN supply_points.cups IS 'Código Universal de Punto de Suministro';

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note')),
  subject VARCHAR(200) NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_company_id ON activities(company_id);
CREATE INDEX idx_activities_customer_id ON activities(customer_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_occurred_at ON activities(occurred_at DESC);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access activities from their company"
  ON activities FOR ALL
  USING (company_id = public.get_auth_company_id());

COMMIT;
