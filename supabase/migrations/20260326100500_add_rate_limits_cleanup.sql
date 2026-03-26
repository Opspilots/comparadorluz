BEGIN;

-- Add a comment about cleanup strategy
COMMENT ON TABLE rate_limits IS 'Rate limiting entries. Rows older than 24h should be purged via scheduled function or pg_cron.';

-- Create a cleanup function that can be called by a scheduled job
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits WHERE created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
