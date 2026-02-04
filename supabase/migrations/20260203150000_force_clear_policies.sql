-- Migration: FORCE CLEAR all policies on users table to eliminate recursion
-- This script explicitly drops every known policy on the users table and re-establishes the single safe policy.

BEGIN;

-- 1. Drop ALL potential policies on users
DROP POLICY IF EXISTS "Users can view users from their company" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users in their company" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- 2. Create the SINGLE safe policy (View Own Profile)
-- This avoids any usage of get_auth_company_id() on the users table itself.
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- 3. Create the SINGLE safe insert policy (for signup)
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- 4. Re-run the profile fix just in case (idempotent)
DO $$ 
DECLARE
  r RECORD;
  v_company_id UUID;
BEGIN
  FOR r IN 
    SELECT * FROM auth.users au 
    WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
  LOOP
    INSERT INTO public.companies (name, cif, email)
    VALUES ('Empresa de ' || split_part(r.email, '@', 1), 'B' || floor(random() * 90000000 + 10000000)::text, r.email)
    RETURNING id INTO v_company_id;

    INSERT INTO public.users (id, company_id, email, full_name, role)
    VALUES (r.id, v_company_id, r.email, split_part(r.email, '@', 1), 'admin');
  END LOOP;
END $$;

COMMIT;
