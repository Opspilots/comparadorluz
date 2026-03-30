-- Migration: Validate consent types in sign_consent_request
-- Prevents callers from passing arbitrary consent types not present in the request.

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

COMMIT;
