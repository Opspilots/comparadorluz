-- Migration to create an RPC function for atomic user and company signup
-- This bypasses RLS policies that reject queries when a user lacks an active session

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
END;
$$;
