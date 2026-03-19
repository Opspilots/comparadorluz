-- Fix: Allow admin/manager users to update their own company settings
-- This was missing, causing BrandingSettingsCard.handleSave() to silently fail

BEGIN;

-- Drop if exists to be idempotent
DROP POLICY IF EXISTS "Admins can update their own company" ON public.companies;

CREATE POLICY "Admins can update their own company"
  ON public.companies FOR UPDATE
  USING (id = public.get_auth_company_id())
  WITH CHECK (id = public.get_auth_company_id());

-- Also add sidebar_color column for sidebar background customization
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sidebar_color VARCHAR(7) DEFAULT '#0f172a';

COMMENT ON COLUMN companies.sidebar_color IS 'Hex color code for sidebar background (#RRGGBB)';

COMMIT;
