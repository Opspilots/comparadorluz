-- Migration: Drop overly permissive INSERT policy on market_prices
-- The policy "service_role_can_insert_market_prices" (created in 20260312000000_integrations_v2.sql)
-- allowed any authenticated user to insert global market price data via WITH CHECK (true).
-- Service role bypasses RLS by default, so no INSERT policy is needed for it.
-- Note: This was also addressed in 20260317000000_fix_critical_security.sql but we include
-- it here as a safety net with IF EXISTS to ensure idempotency.

BEGIN;

DROP POLICY IF EXISTS "service_role_can_insert_market_prices" ON market_prices;
-- Service role bypasses RLS, so no INSERT policy is needed for it
-- Only service_role should insert market prices

COMMIT;
