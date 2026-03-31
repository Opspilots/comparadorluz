-- Migration: Capture signer IP server-side instead of trusting client input
-- The p_signer_ip parameter is kept for backward compatibility but ignored.
-- IP is derived from Supabase request headers (x-forwarded-for or cf-connecting-ip).

BEGIN;

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
    v_headers TEXT;
    v_real_ip TEXT;
BEGIN
    -- Derive client IP from request headers (server-side, not client-provided)
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NOT NULL THEN
        v_real_ip := COALESCE(
            v_headers::json->>'cf-connecting-ip',
            split_part(v_headers::json->>'x-forwarded-for', ',', 1),
            v_headers::json->>'x-real-ip'
        );
        v_real_ip := NULLIF(TRIM(v_real_ip), '');
    END IF;

    -- Fallback to inet_client_addr if headers unavailable
    IF v_real_ip IS NULL THEN
        v_real_ip := COALESCE(host(inet_client_addr()), 'unknown');
    END IF;

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

    -- Update consent_request to signed (using server-derived IP)
    UPDATE consent_requests
    SET
        status = 'signed',
        signed_at = now(),
        signer_name = p_signer_name,
        signer_nif = p_signer_nif,
        signer_ip = v_real_ip,
        signature_data = p_signature_data,
        updated_at = now()
    WHERE id = v_request.id;

    -- Insert/update customer_consents for each accepted type
    FOREACH v_consent_type IN ARRAY p_accepted_types
    LOOP
        -- Validate that the consent type was part of the original request
        IF NOT (v_consent_type = ANY(v_request.consent_types)) THEN
            RAISE EXCEPTION 'Tipo de consentimiento no válido: %', v_consent_type;
        END IF;

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
                ip_address = v_real_ip,
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
                v_real_ip,
                format('Firmado digitalmente por %s (%s) via enlace de consentimiento',
                    p_signer_name, p_signer_nif)
            );
        END IF;
    END LOOP;

    RETURN json_build_object('success', true);
END;
$$;

COMMIT;
