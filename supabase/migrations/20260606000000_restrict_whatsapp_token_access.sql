-- Migration: Restrict SELECT access to WhatsApp Business access_token
-- Date: 2026-06-06
-- Security issue addressed:
--   company_whatsapp_config.access_token stores the Meta WhatsApp Business
--   token (a bearer credential, valid ~60 days) in plain text. The original
--   RLS policy "whatsapp_config_select" (20260515000000_create_whatsapp_config)
--   lets any admin/manager of the company read the FULL row — including the
--   token in clear — via the anon/authenticated client. RLS filters ROWS, not
--   COLUMNS, so the token leaks to the browser even though the frontend never
--   needs it.
--
-- Who actually reads the token: only server-side Edge Functions
--   (supabase/functions/whatsapp-connect, supabase/functions/send-message),
--   which run as service_role and bypass RLS + column grants entirely.
--
-- What the frontend reads: only status/metadata columns
--   (phone_number_id, verified_name, display_phone_number, quality_rating) —
--   see src/features/auth/components/MessagingSettingsCard.tsx. It never
--   selects access_token.
--
-- Fix: apply COLUMN-LEVEL privileges. A table-level SELECT grant covers every
-- column, so revoking a single column while the table grant remains has no
-- effect. We therefore REVOKE the blanket table SELECT from `authenticated`
-- and re-GRANT SELECT only on the non-secret columns. The row-level policy
-- still applies on top (company scoping + admin/manager check). service_role
-- is untouched and keeps full access.

BEGIN;

-- Drop the blanket table-level SELECT grant for authenticated clients.
REVOKE SELECT ON public.company_whatsapp_config FROM authenticated;

-- Re-grant SELECT on every column EXCEPT access_token. The frontend keeps
-- working (it only reads status/metadata); the token is no longer reachable
-- from the browser client, only from service_role Edge Functions.
GRANT SELECT (
    id,
    company_id,
    phone_number_id,
    waba_id,
    verified_name,
    display_phone_number,
    quality_rating,
    created_at,
    updated_at
) ON public.company_whatsapp_config TO authenticated;

-- Note: INSERT/UPDATE/DELETE grants and their RLS policies are intentionally
-- left as-is. The token is written exclusively by the whatsapp-connect Edge
-- Function (service_role), and blocking authenticated writes of access_token
-- is a separate hardening item tracked in the audit backlog.

COMMIT;
