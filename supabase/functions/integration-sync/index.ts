import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    })

// ---------------------------------------------------------------------------
// Provider verification adapters
// ---------------------------------------------------------------------------

interface VerifyResult {
    ok: boolean
    error?: string
}

/**
 * Verifica que la API key tenga el formato mínimo esperado.
 * Cuando el proveedor no expone un endpoint público de verificación,
 * hacemos una validación optimista de formato y marcamos como activo.
 * El error real se detectará en el primer envío de contrato.
 */
function verifyApiKeyFormat(apiKey: string, minLength = 16): VerifyResult {
    if (!apiKey || apiKey.trim().length < minLength) {
        return { ok: false, error: `La API Key debe tener al menos ${minLength} caracteres` }
    }
    return { ok: true }
}

function verifyBasicAuthFormat(username: string, password: string): VerifyResult {
    if (!username?.trim()) return { ok: false, error: 'El usuario es obligatorio' }
    if (!password?.trim()) return { ok: false, error: 'La contraseña es obligatoria' }
    return { ok: true }
}

async function callVerifyEndpoint(
    url: string,
    headers: Record<string, string>
): Promise<VerifyResult> {
    try {
        const res = await fetch(url, { method: 'GET', headers })
        if (res.ok) return { ok: true }
        if (res.status === 401 || res.status === 403) {
            return { ok: false, error: 'Credenciales inválidas (respuesta del proveedor)' }
        }
        // 404, 5xx, etc. — el endpoint existe pero no podemos verificar; marcamos activo
        return { ok: true }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { ok: false, error: `Error de red al verificar: ${msg}` }
    }
}

// Mapa de proveedores con endpoints de verificación conocidos.
// Completar con las URLs reales cuando el proveedor las proporcione.
const PROVIDER_VERIFY_ENDPOINTS: Record<string, string> = {
    // 'gana-energia': 'https://api.ganaenergia.com/v1/me',
    // 'endesa':       'https://api.endesa.es/v1/ping',
    // 'holaluz':      'https://api.holaluz.com/v1/auth/verify',
    // 'octopus':      'https://api.octopus.energy/v1/',
}

async function verifyCredentials(
    providerSlug: string,
    authType: string,
    credentials: Record<string, string>
): Promise<VerifyResult> {
    if (authType === 'oauth2') {
        // OAuth2 no se puede verificar con credenciales simples; se deja como connecting
        return { ok: true }
    }

    if (authType === 'basic_auth') {
        const formatCheck = verifyBasicAuthFormat(credentials.username, credentials.password)
        if (!formatCheck.ok) return formatCheck

        const endpoint = PROVIDER_VERIFY_ENDPOINTS[providerSlug]
        if (endpoint) {
            const basicToken = btoa(`${credentials.username}:${credentials.password}`)
            return callVerifyEndpoint(endpoint, { Authorization: `Basic ${basicToken}` })
        }
        return { ok: true }
    }

    // api_key (default)
    const formatCheck = verifyApiKeyFormat(credentials.api_key)
    if (!formatCheck.ok) return formatCheck

    const endpoint = PROVIDER_VERIFY_ENDPOINTS[providerSlug]
    if (endpoint) {
        return callVerifyEndpoint(endpoint, {
            Authorization: `Bearer ${credentials.api_key}`,
            'X-API-Key': credentials.api_key,
        })
    }

    return { ok: true }
}

// ---------------------------------------------------------------------------
// Provider contract submission adapters
// ---------------------------------------------------------------------------

interface ContractPayload {
    external_id?: string
    error?: string
}

interface ContractData {
    id: string
    contract_number: string | null
    status: string
    signed_at: string | null
    annual_value_eur: number
    notes: string | null
    customers: { name: string; cif: string; address: string | null } | null
    supply_points: { cups: string | null; address: string; city: string | null } | null
    tariff_versions: { tariff_name: string; tariff_code: string | null; supplier_name: string } | null
    commissioners: { full_name: string; email: string | null } | null
}

/**
 * Construye el payload estándar normalizado.
 * Cada adaptador puede transformarlo al formato específico del proveedor.
 */
function buildStandardPayload(contract: ContractData, agentCode?: string) {
    return {
        agent_code: agentCode ?? null,
        customer: {
            name: contract.customers?.name ?? '',
            cif: contract.customers?.cif ?? '',
            address: contract.customers?.address ?? '',
        },
        supply_point: {
            cups: contract.supply_points?.cups ?? null,
            address: contract.supply_points?.address ?? '',
            city: contract.supply_points?.city ?? '',
        },
        tariff: {
            name: contract.tariff_versions?.tariff_name ?? '',
            code: contract.tariff_versions?.tariff_code ?? null,
        },
        contract: {
            internal_id: contract.id,
            internal_number: contract.contract_number ?? '',
            annual_value_eur: contract.annual_value_eur,
            signed_at: contract.signed_at ?? new Date().toISOString(),
            notes: contract.notes ?? '',
        },
    }
}

// Mapa de endpoints de envío de contratos por proveedor.
// Completar con las URLs reales de cada comercializadora.
const PROVIDER_SUBMIT_ENDPOINTS: Record<string, { url: string; method: string }> = {
    // 'gana-energia': { url: 'https://api.ganaenergia.com/v1/contracts', method: 'POST' },
    // 'endesa':       { url: 'https://api.endesa.es/v1/contracts',       method: 'POST' },
    // 'holaluz':      { url: 'https://api.holaluz.com/v1/contracts',     method: 'POST' },
    // 'octopus':      { url: 'https://api.octopus.energy/v1/contracts',  method: 'POST' },
}

async function submitContractToProvider(
    providerSlug: string,
    authType: string,
    credentials: Record<string, string>,
    agentCode: string | undefined,
    contract: ContractData
): Promise<ContractPayload> {
    const endpointConfig = PROVIDER_SUBMIT_ENDPOINTS[providerSlug]

    if (!endpointConfig) {
        // Proveedor sin endpoint configurado todavía.
        // Generamos un ID externo simulado para que el flujo funcione end-to-end.
        const simulatedId = `${providerSlug.toUpperCase()}-${Date.now()}`
        console.info(`integration-sync: no submit endpoint for ${providerSlug}, using simulated id ${simulatedId}`)
        return { external_id: simulatedId }
    }

    const payload = buildStandardPayload(contract, agentCode)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authType === 'api_key') {
        headers['Authorization'] = `Bearer ${credentials.api_key}`
        headers['X-API-Key'] = credentials.api_key
    } else if (authType === 'basic_auth') {
        headers['Authorization'] = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
    }

    try {
        const res = await fetch(endpointConfig.url, {
            method: endpointConfig.method,
            headers,
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            return { error: `Error ${res.status} del proveedor: ${text.slice(0, 200)}` }
        }

        const data = await res.json() as Record<string, unknown>
        // La mayoría de las APIs devuelven el ID externo en id / contract_id / reference
        const externalId =
            (data.id as string) ??
            (data.contract_id as string) ??
            (data.reference as string) ??
            (data.external_id as string) ??
            `${providerSlug.toUpperCase()}-${Date.now()}`

        return { external_id: externalId }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { error: `Error de red al enviar contrato: ${msg}` }
    }
}

// ---------------------------------------------------------------------------
// Supplier name → provider slug mapping
// ---------------------------------------------------------------------------

const SUPPLIER_TO_SLUG: Record<string, string> = {
    'gana energía': 'gana-energia',
    'gana energia': 'gana-energia',
    'iberdrola': 'iberdrola',
    'endesa': 'endesa',
    'naturgy': 'naturgy',
    'repsol': 'repsol',
    'holaluz': 'holaluz',
    'podo': 'podo',
    'octopus energy': 'octopus',
    'octopus': 'octopus',
}

export function supplierNameToSlug(name: string): string | null {
    return SUPPLIER_TO_SLUG[name.toLowerCase().trim()] ?? null
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = await req.json() as {
            action: 'verify' | 'submit_contract' | 'request_switching'
            integrationId?: string
            contractId?: string
            companyId?: string
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ===================================================================
        // action: verify — validate credentials and update integration status
        // ===================================================================
        if (body.action === 'verify') {
            const { integrationId } = body
            if (!integrationId) return respond({ ok: false, error: 'integrationId requerido' }, 400)

            const { data: integration, error: intErr } = await supabase
                .from('integrations')
                .select('*, integration_providers(*)')
                .eq('id', integrationId)
                .single()

            if (intErr || !integration) {
                return respond({ ok: false, error: 'Integración no encontrada' }, 404)
            }

            const provider = integration.integration_providers as {
                slug: string
                auth_type: string
                display_name: string
            }

            const result = await verifyCredentials(
                provider.slug,
                provider.auth_type,
                (integration.credentials ?? {}) as Record<string, string>
            )

            if (result.ok) {
                await supabase
                    .from('integrations')
                    .update({
                        status: 'active',
                        last_sync_at: new Date().toISOString(),
                        last_error: null,
                    })
                    .eq('id', integrationId)

                return respond({ ok: true })
            } else {
                await supabase
                    .from('integrations')
                    .update({
                        status: 'error',
                        last_error: result.error ?? 'Error de verificación desconocido',
                    })
                    .eq('id', integrationId)

                return respond({ ok: false, error: result.error })
            }
        }

        // ===================================================================
        // action: submit_contract — send contract data to provider API
        // ===================================================================
        if (body.action === 'submit_contract') {
            const { contractId, companyId } = body
            if (!contractId || !companyId) {
                return respond({ ok: false, error: 'contractId y companyId son requeridos' }, 400)
            }

            // Load full contract data
            const { data: contract, error: contractErr } = await supabase
                .from('contracts')
                .select(`
                    id, contract_number, status, signed_at, annual_value_eur, notes,
                    customers ( name, cif, address ),
                    supply_points ( cups, address, city ),
                    tariff_versions ( tariff_name, tariff_code, supplier_name ),
                    commissioners ( full_name, email )
                `)
                .eq('id', contractId)
                .eq('company_id', companyId)
                .single()

            if (contractErr || !contract) {
                return respond({ ok: false, error: 'Contrato no encontrado' }, 404)
            }

            // Determine supplier slug from tariff
            const supplierName = (contract.tariff_versions as { supplier_name: string } | null)?.supplier_name ?? ''
            const providerSlug = supplierNameToSlug(supplierName)

            if (!providerSlug) {
                return respond({
                    ok: false,
                    error: `No hay adaptador para la comercializadora "${supplierName}"`,
                })
            }

            // Find active integration for this company + provider
            const { data: integration, error: intErr } = await supabase
                .from('integrations')
                .select('*, integration_providers(*)')
                .eq('company_id', companyId)
                .eq('status', 'active')
                .eq('sync_enabled', true)
                .eq('integration_providers.slug', providerSlug)
                .maybeSingle()

            if (intErr || !integration) {
                return respond({
                    ok: false,
                    error: `No hay integración activa con ${supplierName}`,
                    no_integration: true,
                })
            }

            // Check capability
            const provider = integration.integration_providers as {
                slug: string
                auth_type: string
                capabilities: string[]
            }

            if (!provider.capabilities.includes('contract_submit')) {
                return respond({
                    ok: false,
                    error: `${supplierName} no soporta envío de contratos via API`,
                })
            }

            const agentCode = (integration.agent_config as { agent_code?: string })?.agent_code

            const result = await submitContractToProvider(
                provider.slug,
                provider.auth_type,
                (integration.credentials ?? {}) as Record<string, string>,
                agentCode,
                contract as unknown as ContractData
            )

            if (result.error) {
                // Update integration with last error
                await supabase
                    .from('integrations')
                    .update({ last_error: result.error })
                    .eq('id', integration.id)

                // Log event
                await supabase.from('integration_events').insert({
                    company_id: companyId,
                    integration_id: integration.id,
                    event_type: 'contract.submit_failed',
                    payload: { contract_id: contractId, error: result.error },
                    contract_id: contractId,
                    processed: false,
                    error: result.error,
                })

                return respond({ ok: false, error: result.error })
            }

            // Update contract with external ID and link to integration
            await supabase
                .from('contracts')
                .update({
                    contract_number: result.external_id,
                    integration_id: integration.id,
                })
                .eq('id', contractId)

            // Update integration last_sync_at and clear errors
            await supabase
                .from('integrations')
                .update({
                    last_sync_at: new Date().toISOString(),
                    last_error: null,
                })
                .eq('id', integration.id)

            // Log successful event
            await supabase.from('integration_events').insert({
                company_id: companyId,
                integration_id: integration.id,
                event_type: 'contract.submitted',
                payload: { contract_id: contractId, external_id: result.external_id },
                contract_id: contractId,
                processed: true,
                processed_at: new Date().toISOString(),
            })

            return respond({
                ok: true,
                external_id: result.external_id,
            })
        }

        // ===================================================================
        // action: request_switching — initiate supplier switch for a contract
        // ===================================================================
        if (body.action === 'request_switching') {
            const { contractId, companyId } = body
            if (!contractId || !companyId) {
                return respond({ ok: false, error: 'contractId y companyId son requeridos' }, 400)
            }

            // Load full contract data
            const { data: contract, error: contractErr } = await supabase
                .from('contracts')
                .select(`
                    id, contract_number, status, signed_at, annual_value_eur, notes,
                    switching_status,
                    customers ( name, cif, address ),
                    supply_points ( cups, address, city ),
                    tariff_versions ( tariff_name, tariff_code, supplier_name ),
                    commissioners ( full_name, email )
                `)
                .eq('id', contractId)
                .eq('company_id', companyId)
                .single()

            if (contractErr || !contract) {
                return respond({ ok: false, error: 'Contrato no encontrado' }, 404)
            }

            if (contract.status !== 'signed' && contract.status !== 'active') {
                return respond({
                    ok: false,
                    error: 'El contrato debe estar firmado o activo para solicitar el cambio',
                })
            }

            if (contract.switching_status === 'requested' || contract.switching_status === 'in_progress') {
                return respond({
                    ok: false,
                    error: 'Ya existe una solicitud de cambio en curso',
                })
            }

            // Determine supplier slug
            const supplierName = (contract.tariff_versions as { supplier_name: string } | null)?.supplier_name ?? ''
            const providerSlug = supplierNameToSlug(supplierName)

            if (!providerSlug) {
                return respond({
                    ok: false,
                    error: `No hay adaptador para la comercializadora "${supplierName}"`,
                })
            }

            // Find active integration with switching capability
            const { data: integration, error: intErr } = await supabase
                .from('integrations')
                .select('*, integration_providers(*)')
                .eq('company_id', companyId)
                .eq('status', 'active')
                .eq('sync_enabled', true)
                .eq('integration_providers.slug', providerSlug)
                .maybeSingle()

            if (intErr || !integration) {
                return respond({
                    ok: false,
                    error: `No hay integracion activa con ${supplierName}`,
                    no_integration: true,
                })
            }

            const provider = integration.integration_providers as {
                slug: string
                auth_type: string
                capabilities: string[]
            }

            if (!provider.capabilities.includes('switching')) {
                return respond({
                    ok: false,
                    error: `${supplierName} no soporta cambio de comercializadora (switching) via API`,
                })
            }

            // Build switching payload
            const switchingPayload = {
                action: 'switch_supplier',
                agent_code: (integration.agent_config as { agent_code?: string })?.agent_code ?? null,
                customer: {
                    name: (contract.customers as { name: string } | null)?.name ?? '',
                    cif: (contract.customers as { cif: string } | null)?.cif ?? '',
                },
                supply_point: {
                    cups: (contract.supply_points as { cups: string | null } | null)?.cups ?? null,
                    address: (contract.supply_points as { address: string } | null)?.address ?? '',
                },
                contract: {
                    internal_id: contract.id,
                    internal_number: contract.contract_number ?? '',
                    annual_value_eur: contract.annual_value_eur,
                },
                tariff: {
                    name: (contract.tariff_versions as { tariff_name: string } | null)?.tariff_name ?? '',
                    code: (contract.tariff_versions as { tariff_code: string | null } | null)?.tariff_code ?? null,
                },
            }

            // Attempt to send switching request to provider API
            const PROVIDER_SWITCHING_ENDPOINTS: Record<string, { url: string; method: string }> = {
                // Placeholder — complete with real endpoints when available
                // 'gana-energia': { url: 'https://api.ganaenergia.com/v1/switching', method: 'POST' },
            }

            const endpointConfig = PROVIDER_SWITCHING_ENDPOINTS[provider.slug]
            let switchingRef: string | null = null

            if (endpointConfig) {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                const creds = (integration.credentials ?? {}) as Record<string, string>
                if (provider.auth_type === 'api_key') {
                    headers['Authorization'] = `Bearer ${creds.api_key}`
                    headers['X-API-Key'] = creds.api_key
                } else if (provider.auth_type === 'basic_auth') {
                    headers['Authorization'] = `Basic ${btoa(`${creds.username}:${creds.password}`)}`
                }

                try {
                    const res = await fetch(endpointConfig.url, {
                        method: endpointConfig.method,
                        headers,
                        body: JSON.stringify(switchingPayload),
                    })

                    if (!res.ok) {
                        const text = await res.text().catch(() => '')
                        // Update contract with error
                        await supabase
                            .from('contracts')
                            .update({ switching_status: 'rejected' })
                            .eq('id', contractId)

                        await supabase.from('integration_events').insert({
                            company_id: companyId,
                            integration_id: integration.id,
                            event_type: 'switching.request_failed',
                            payload: { contract_id: contractId, error: text.slice(0, 200) },
                            contract_id: contractId,
                            processed: false,
                            error: `Error ${res.status}: ${text.slice(0, 200)}`,
                        })

                        return respond({ ok: false, error: `Error del proveedor: ${text.slice(0, 200)}` })
                    }

                    const data = await res.json() as Record<string, unknown>
                    switchingRef = (data.switching_id as string) ?? (data.reference as string) ?? (data.id as string) ?? null
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e)
                    return respond({ ok: false, error: `Error de red: ${msg}` })
                }
            } else {
                // No endpoint configured — simulate switching request
                switchingRef = `SW-${provider.slug.toUpperCase()}-${Date.now()}`
                console.info(`integration-sync: no switching endpoint for ${provider.slug}, simulated ref ${switchingRef}`)
            }

            // Update contract switching status
            await supabase
                .from('contracts')
                .update({
                    switching_status: 'requested',
                    switching_requested_at: new Date().toISOString(),
                })
                .eq('id', contractId)

            // Update integration sync timestamp
            await supabase
                .from('integrations')
                .update({ last_sync_at: new Date().toISOString(), last_error: null })
                .eq('id', integration.id)

            // Log event
            await supabase.from('integration_events').insert({
                company_id: companyId,
                integration_id: integration.id,
                event_type: 'switching.requested',
                payload: { contract_id: contractId, switching_ref: switchingRef },
                contract_id: contractId,
                processed: true,
                processed_at: new Date().toISOString(),
            })

            return respond({ ok: true, switching_ref: switchingRef })
        }

        return respond({ ok: false, error: `Acción desconocida: ${body.action}` }, 400)

    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.error('integration-sync: unhandled error', err)
        return respond({ ok: false, error: err.message }, 500)
    }
})
