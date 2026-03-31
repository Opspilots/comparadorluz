-- Migration: Enable RLS on user_profiles and add access policies
-- Date: 2026-04-01

BEGIN;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: users can view profiles in their company
CREATE POLICY "Users can view profiles in their company"
  ON user_profiles FOR SELECT
  USING (company_id = public.get_auth_company_id());

-- UPDATE: users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- INSERT: users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMIT;
