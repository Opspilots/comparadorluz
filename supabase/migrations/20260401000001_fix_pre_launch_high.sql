-- Migration: Fix 3 high-severity pre-launch issues
-- Date: 2026-04-01
-- Fixes:
--   #8: notifications & notification_settings missing company_id (multi-tenant gap)
--   #9: campaign_recipients missing UPDATE/DELETE RLS policies
--   #10: suppliers SELECT policy name mismatch (original policy never dropped)

BEGIN;

-- ============================================================================
-- #8: Add company_id to notifications and notification_settings
-- Both tables only have user_id — no tenant isolation at the RLS level.
-- ============================================================================

-- 8a. notifications — add column (nullable first)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Backfill from users table
UPDATE notifications n
SET company_id = u.company_id
FROM users u
WHERE n.user_id = u.id
  AND n.company_id IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE notifications
  ALTER COLUMN company_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_notifications_company_id
  ON notifications(company_id);

-- Replace existing SELECT policy with company-scoped version
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

-- Replace existing UPDATE policy with company-scoped version
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

-- 8b. notification_settings — add column (nullable first)
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Backfill from users table
UPDATE notification_settings ns
SET company_id = u.company_id
FROM users u
WHERE ns.user_id = u.id
  AND ns.company_id IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE notification_settings
  ALTER COLUMN company_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_notification_settings_company_id
  ON notification_settings(company_id);

-- Replace existing policies with company-scoped versions
DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
CREATE POLICY "Users can view their own notification settings"
  ON notification_settings FOR SELECT
  USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
CREATE POLICY "Users can update their own notification settings"
  ON notification_settings FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
CREATE POLICY "Users can insert their own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND user_id = auth.uid());

-- ============================================================================
-- #9: campaign_recipients missing UPDATE and DELETE RLS policies
-- Only SELECT and INSERT existed — users cannot update status or remove recipients.
-- ============================================================================

CREATE POLICY "Users can update recipients from their company via campaign"
  ON campaign_recipients FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE company_id = public.get_auth_company_id()
    )
  );

CREATE POLICY "Users can delete recipients from their company via campaign"
  ON campaign_recipients FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE company_id = public.get_auth_company_id()
    )
  );

-- ============================================================================
-- #10: suppliers SELECT policy name mismatch
-- Original migration (20260204130000) created: suppliers_select_policy
-- Fix migration (20260319100000) tried to drop "Users can view their company suppliers"
--   which didn't exist, so the old policy was never removed. Now two SELECT policies
--   coexist. Drop the original one so only the global-aware policy remains.
-- ============================================================================

DROP POLICY IF EXISTS suppliers_select_policy ON suppliers;

-- Also ensure the global-aware policy exists (idempotent recreate)
DROP POLICY IF EXISTS "Users can view their company suppliers" ON suppliers;
CREATE POLICY "Users can view their company suppliers"
  ON suppliers FOR SELECT
  USING (
    is_global = true
    OR company_id = public.get_auth_company_id()
  );

COMMIT;
