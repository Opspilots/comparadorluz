BEGIN;

-- ============================================================================
-- Function: seed_default_suppliers(company_id)
-- Inserts all major Spanish energy suppliers for a given company.
-- Skips any that already exist (by name + company_id).
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_default_suppliers(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO suppliers (company_id, name, slug, is_active, is_green, is_global)
  VALUES
    (p_company_id, 'Galp', 'galp', true, false, false),
    (p_company_id, 'Naturgy', 'naturgy', true, false, false),
    (p_company_id, 'Endesa', 'endesa', true, false, false),
    (p_company_id, 'Iberdrola', 'iberdrola', true, false, false),
    (p_company_id, 'Repsol', 'repsol', true, false, false),
    (p_company_id, 'TotalEnergies', 'totalenergies', true, false, false),
    (p_company_id, 'Plenitude', 'plenitude', true, false, false),
    (p_company_id, 'Viesgo', 'viesgo', true, false, false),
    (p_company_id, 'Audax', 'audax', true, false, false),
    (p_company_id, 'Axpo', 'axpo', true, false, false),
    (p_company_id, 'Cepsa', 'cepsa', true, false, false),
    (p_company_id, 'Holaluz', 'holaluz', true, true, false),
    (p_company_id, 'Factor Energía', 'factor-energia', true, false, false),
    (p_company_id, 'Som Energia', 'som-energia', true, true, false),
    (p_company_id, 'Feníe Energía', 'fenie-energia', true, false, false),
    (p_company_id, 'Aldro', 'aldro', true, false, false),
    (p_company_id, 'Octopus Energy', 'octopus-energy', true, true, false),
    (p_company_id, 'Wekiwi', 'wekiwi', true, false, false),
    (p_company_id, 'Pepe Energy', 'pepe-energy', true, true, false),
    (p_company_id, 'Nexus', 'nexus', true, false, false),
    (p_company_id, 'Lucera', 'lucera', true, true, false),
    (p_company_id, 'EDP', 'edp', true, false, false),
    (p_company_id, 'Engie', 'engie', true, false, false),
    (p_company_id, 'Acciona', 'acciona', true, true, false),
    (p_company_id, 'Escandinava de Electricidad', 'escandinava', true, true, false),
    (p_company_id, 'Energya VM', 'energya-vm', true, false, false),
    (p_company_id, 'Curenergia', 'curenergia', true, false, false),
    (p_company_id, 'Imagina Energía', 'imagina-energia', true, true, false),
    (p_company_id, 'Enel', 'enel', true, false, false),
    (p_company_id, 'BP Energy', 'bp-energy', true, false, false)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================================================
-- Update create_company_with_user to seed suppliers on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION create_company_with_user(
  p_user_id UUID,
  p_email TEXT,
  p_company_name TEXT,
  p_cif TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- 1. Create the company
  INSERT INTO companies (name, email, cif, status)
  VALUES (p_company_name, p_email, p_cif, 'active')
  RETURNING id INTO v_company_id;

  -- 2. Create the user link
  INSERT INTO users (id, company_id, email, full_name, role, status)
  VALUES (
    p_user_id,
    v_company_id,
    p_email,
    'Usuario Inicial',
    'admin',
    'active'
  );

  -- 3. Seed default suppliers for the new company
  PERFORM seed_default_suppliers(v_company_id);
END;
$$;

-- ============================================================================
-- Seed suppliers for all existing companies that have none
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.id FROM companies c
    WHERE NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.company_id = c.id)
  LOOP
    PERFORM seed_default_suppliers(r.id);
  END LOOP;
END;
$$;

COMMIT;
