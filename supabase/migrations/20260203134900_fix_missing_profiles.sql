-- Migration: Fix missing public user profiles
-- This script ensures that for every user in auth.users, there is a corresponding record in public.users.
-- It also ensures a company exists for them.

BEGIN;

DO $$ 
DECLARE
  r RECORD;
  v_company_id UUID;
BEGIN
  -- Loop through all users in auth.users who do not have a record in public.users
  FOR r IN 
    SELECT * FROM auth.users au 
    WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
  LOOP
    
    -- 1. Check if we can find an existing company for this user (custom logic, e.g. via domain)
    -- For now, we'll creates a new company for them if they don't have one linked (conceptually).
    -- Since we don't have the link, we create a new company for this "orphaned" user.
    
    INSERT INTO public.companies (name, cif, email)
    VALUES (
      'Empresa de ' || split_part(r.email, '@', 1),
      'B' || floor(random() * 90000000 + 10000000)::text,
      r.email
    )
    RETURNING id INTO v_company_id;

    -- 2. Insert the missing public.users record
    INSERT INTO public.users (id, company_id, email, full_name, role)
    VALUES (
      r.id,
      v_company_id,
      r.email,
      split_part(r.email, '@', 1), -- Default name from email
      'admin'
    );
    
    RAISE NOTICE 'Fixed missing profile for user: %', r.email;
    
  END LOOP;
END $$;

COMMIT;
