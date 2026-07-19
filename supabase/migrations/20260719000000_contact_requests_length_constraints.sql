-- Migration: length constraints on contact_requests free-text fields
--
-- The public landing contact form inserts directly from the browser via the
-- Supabase JS client (anon role, policy WITH CHECK (true)). There is no Edge
-- Function in the path, so the _shared/rate-limit.ts middleware cannot be
-- applied. To bound abuse (giant payload stuffing) we enforce maximum lengths
-- at the database level, which apply regardless of the client.

BEGIN;

-- Trim-based non-emptiness for required fields + sane upper bounds.
ALTER TABLE contact_requests
    ADD CONSTRAINT contact_requests_nombre_len
        CHECK (char_length(nombre) BETWEEN 1 AND 120),
    ADD CONSTRAINT contact_requests_email_len
        CHECK (char_length(email) BETWEEN 3 AND 200),
    ADD CONSTRAINT contact_requests_empresa_len
        CHECK (empresa IS NULL OR char_length(empresa) <= 160),
    ADD CONSTRAINT contact_requests_mensaje_len
        CHECK (char_length(mensaje) BETWEEN 1 AND 4000);

COMMIT;
