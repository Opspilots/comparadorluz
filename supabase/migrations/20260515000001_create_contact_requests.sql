BEGIN;

CREATE TABLE IF NOT EXISTS contact_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL,
    empresa TEXT,
    mensaje TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon + authenticated) to submit contact requests
CREATE POLICY "contact_requests_insert_anon" ON contact_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "contact_requests_insert_auth" ON contact_requests FOR INSERT TO authenticated WITH CHECK (true);

-- Only service role can read (admin dashboard, not exposed to frontend)
COMMENT ON TABLE contact_requests IS 'Landing page contact form submissions — readable only via service role';

COMMIT;
