-- Migration: Fix stale RLS policies and indexes after commissioner split
-- The split_commissioners migration renamed user_id -> commissioner_id
-- but didn't update the SELECT RLS policies or indexes.

BEGIN;

-- ============================================================================
-- Fix commission_events RLS policies
-- ============================================================================

-- Drop the old SELECT policy that references the renamed column
DROP POLICY IF EXISTS "Commercials can view their own events" ON commission_events;

-- Recreate with correct column name
-- Commissioner-linked users can view their own events via the commissioners table
CREATE POLICY "Commissioners can view their own events"
  ON commission_events FOR SELECT
  USING (
    company_id = public.get_auth_company_id()
    AND commissioner_id IN (
      SELECT id FROM commissioners WHERE user_id = auth.uid()
    )
  );

-- Fix stale index name
DROP INDEX IF EXISTS idx_commission_events_user_id;
CREATE INDEX IF NOT EXISTS idx_commission_events_commissioner_id ON commission_events(commissioner_id);

-- ============================================================================
-- Fix payouts RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Commercials can view their own payouts" ON payouts;

CREATE POLICY "Commissioners can view their own payouts"
  ON payouts FOR SELECT
  USING (
    company_id = public.get_auth_company_id()
    AND commissioner_id IN (
      SELECT id FROM commissioners WHERE user_id = auth.uid()
    )
  );

-- Fix stale index name
DROP INDEX IF EXISTS idx_payouts_user_id;
CREATE INDEX IF NOT EXISTS idx_payouts_commissioner_id ON payouts(commissioner_id);

-- ============================================================================
-- Fix commission_rules RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Commercials can view their own rules" ON commission_rules;

CREATE POLICY "Commissioners can view their own rules"
  ON commission_rules FOR SELECT
  USING (
    company_id = public.get_auth_company_id()
    AND commissioner_id IN (
      SELECT id FROM commissioners WHERE user_id = auth.uid()
    )
  );

-- Fix stale index name
DROP INDEX IF EXISTS idx_commission_rules_user_id;
CREATE INDEX IF NOT EXISTS idx_commission_rules_commissioner_id ON commission_rules(commissioner_id);

COMMIT;
