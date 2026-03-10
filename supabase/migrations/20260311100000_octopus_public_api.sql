BEGIN;

-- Allow 'none' auth_type for providers with public APIs (e.g. Octopus Energy)
ALTER TABLE integration_providers
    DROP CONSTRAINT IF EXISTS integration_providers_auth_type_check;

ALTER TABLE integration_providers
    ADD CONSTRAINT integration_providers_auth_type_check
    CHECK (auth_type IN ('api_key', 'oauth2', 'basic_auth', 'none'));

-- Update Octopus Energy to use no authentication (public API for tariffs)
UPDATE integration_providers
SET
    auth_type = 'none',
    docs_url = 'https://developer.octopus.energy/',
    capabilities = ARRAY['quote', 'consumption']
WHERE slug = 'octopus';

COMMIT;
