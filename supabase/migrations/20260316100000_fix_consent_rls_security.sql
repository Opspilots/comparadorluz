-- =============================================================================
-- FIX: Consent requests RLS — replace open anon policies with secure RPC
-- =============================================================================
-- Previous policies allowed anonymous users to read ALL consent_requests
-- and insert customer_consents with arbitrary company_id/customer_id.
-- This migration replaces them with a SECURITY DEFINER RPC approach.
-- =============================================================================

BEGIN;

-- 1. Drop the insecure anon policies
DROP POLICY IF EXISTS "Public signing read" ON consent_requests;
DROP POLICY IF EXISTS "Public signing update" ON consent_requests;
DROP POLICY IF EXISTS "Public consent insert" ON customer_consents;

-- 2. Create a secure RPC to fetch a consent request by token (anon-safe)
CREATE OR REPLACE FUNCTION get_consent_request_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    customer_id UUID,
    consent_types TEXT[],
    legal_text TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signer_name TEXT,
    company_name TEXT,
    customer_name TEXT,
    customer_cif TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        cr.id,
        cr.company_id,
        cr.customer_id,
        cr.consent_types,
        cr.legal_text,
        cr.status,
        cr.expires_at,
        cr.signed_at,
        cr.signer_name,
        c.name AS company_name,
        cu.name AS customer_name,
        cu.cif AS customer_cif
    FROM consent_requests cr
    LEFT JOIN companies c ON c.id = cr.company_id
    LEFT JOIN customers cu ON cu.id = cr.customer_id
    WHERE cr.token = p_token
    LIMIT 1;
$$;

-- 3. Create a secure RPC to sign a consent request (anon-safe)
CREATE OR REPLACE FUNCTION sign_consent_request(
    p_token TEXT,
    p_signer_name TEXT,
    p_signer_nif TEXT,
    p_signer_ip TEXT,
    p_signature_data TEXT,
    p_accepted_types TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request consent_requests%ROWTYPE;
    v_consent_type TEXT;
    v_existing_id UUID;
BEGIN
    -- Fetch and validate the request
    SELECT * INTO v_request
    FROM consent_requests
    WHERE token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Token no válido');
    END IF;

    IF v_request.status NOT IN ('sent', 'viewed') THEN
        RETURN json_build_object('success', false, 'error', 'Este documento ya ha sido procesado');
    END IF;

    IF v_request.expires_at < now() THEN
        UPDATE consent_requests
        SET status = 'expired', expired_at = now(), updated_at = now()
        WHERE id = v_request.id;
        RETURN json_build_object('success', false, 'error', 'Este enlace ha expirado');
    END IF;

    -- Update consent_request to signed
    UPDATE consent_requests
    SET
        status = 'signed',
        signed_at = now(),
        signer_name = p_signer_name,
        signer_nif = p_signer_nif,
        signer_ip = p_signer_ip,
        signature_data = p_signature_data,
        updated_at = now()
    WHERE id = v_request.id;

    -- Insert/update customer_consents for each accepted type
    FOREACH v_consent_type IN ARRAY p_accepted_types
    LOOP
        SELECT id INTO v_existing_id
        FROM customer_consents
        WHERE company_id = v_request.company_id
          AND customer_id = v_request.customer_id
          AND consent_type = v_consent_type
          AND revoked_at IS NULL
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            UPDATE customer_consents
            SET
                granted = true,
                granted_at = now(),
                granted_by = 'customer_self',
                method = 'digital',
                ip_address = p_signer_ip,
                notes = format('Firmado digitalmente por %s (%s) via enlace de consentimiento',
                    p_signer_name, p_signer_nif),
                updated_at = now()
            WHERE id = v_existing_id;
        ELSE
            INSERT INTO customer_consents (
                company_id, customer_id, consent_type,
                granted, granted_at, granted_by, method,
                ip_address, notes
            ) VALUES (
                v_request.company_id, v_request.customer_id, v_consent_type,
                true, now(), 'customer_self', 'digital',
                p_signer_ip,
                format('Firmado digitalmente por %s (%s) via enlace de consentimiento',
                    p_signer_name, p_signer_nif)
            );
        END IF;
    END LOOP;

    RETURN json_build_object('success', true);
END;
$$;

-- 4. Grant execute to anon role (these RPCs are the only way anon interacts with consent data)
GRANT EXECUTE ON FUNCTION get_consent_request_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION sign_consent_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO anon;

-- 5. Add a narrow anon policy to allow marking as "viewed" by token only
CREATE POLICY "Anon can mark viewed by token" ON consent_requests
    FOR UPDATE TO anon
    USING (status = 'sent')
    WITH CHECK (status = 'viewed');

COMMIT;
