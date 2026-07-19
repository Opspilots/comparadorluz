-- Migration: restrict contact_requests INSERT to service_role only
--
-- The public landing contact form no longer inserts directly from the browser.
-- Submissions now go through the `submit-contact-request` Edge Function, which
-- applies IP-based rate limiting and length validation and then inserts using
-- the service_role key. Direct anon/authenticated INSERT is therefore removed
-- so the only path into this table is the throttled server-side one.
--
-- The previous policies come from 20260515000001_create_contact_requests.sql:
--   "contact_requests_insert_anon"  (TO anon)
--   "contact_requests_insert_auth"  (TO authenticated)
-- service_role bypasses RLS entirely, so no explicit INSERT policy is needed
-- for the Edge Function.

BEGIN;

DROP POLICY IF EXISTS "contact_requests_insert_anon" ON contact_requests;
DROP POLICY IF EXISTS "contact_requests_insert_auth" ON contact_requests;

COMMENT ON TABLE contact_requests IS 'Landing page contact form submissions — inserted only via the submit-contact-request Edge Function (service_role); readable only via service role';

COMMIT;
