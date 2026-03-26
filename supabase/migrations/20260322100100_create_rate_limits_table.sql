-- Migration: Rate limits tracking table for Edge Functions
-- Used by _shared/rate-limit.ts to enforce per-company request quotas

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL, -- Can be company_id or user_id depending on context
  action VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient window queries
CREATE INDEX idx_rate_limits_lookup
  ON public.rate_limits (company_id, action, created_at DESC);

-- Auto-cleanup: delete entries older than 24 hours via pg_cron or manual job
-- For now, add a simple retention comment
COMMENT ON TABLE public.rate_limits IS 'Edge Function rate limiting. Entries older than 24h can be safely purged.';

-- RLS: only service role should access this table (Edge Functions use service key)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No user-facing policies — only service_role can read/write

COMMIT;
