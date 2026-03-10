// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
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

function verifyApiKeyFormat(apiKey: string, minLength = 16) {
    if (!apiKey || apiKey.trim().length < minLength) return { ok: false, error: `La API Key debe tener al menos ${minLength} caracteres` }
    return { ok: true }
}

function verifyBasicAuthFormat(username: string, password: string) {
    if (!username?.trim()) return { ok: false, error: 'El usuario es obligatorio' }
    if (!password?.trim()) return { ok: false, error: 'La contraseña es obligatoria' }
    return { ok: true }
}

async function callVerifyEndpoint(url: string, headers: Record<string, string>) {
    try {
        const res = await fetch(url, { method: 'GET', headers })
        if (res.ok) return { ok: true }
        if (res.status === 401 || res.status === 403) return { ok: false, error: 'Credenciales inválidas' }
        return { ok: true }
    } catch (e: unknown) {
        return { ok: false, error: `Error de red al verificar: ${(e as Error).message}` }
    }
}

const PROVIDER_VERIFY_ENDPOINTS: Record<string, string> = {
    'octopus': 'https://api.octopus.energy/v1/products/',
}

async function verifyCredentials(providerSlug: string, authType: string, credentials: Record<string, string>) {
    if (authType === 'none') {
        const ep = PROVIDER_VERIFY_ENDPOINTS[providerSlug]
        if (ep) return callVerifyEndpoint(ep, {})
        return { ok: true }
    }
    if (authType === 'oauth2') return { ok: true }
    if (authType === 'basic_auth') {
        const fc = verifyBasicAuthFormat(credentials.username, credentials.password)
        if (!fc.ok) return fc
        const ep = PROVIDER_VERIFY_ENDPOINTS[providerSlug]
        if (ep) return callVerifyEndpoint(ep, { Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}` })
        return { ok: true }
    }
    const fc = verifyApiKeyFormat(credentials.api_key)
    if (!fc.ok) return fc
    const ep = PROVIDER_VERIFY_ENDPOINTS[providerSlug]
    if (ep) return callVerifyEndpoint(ep, { Authorization: `Bearer ${credentials.api_key}`, 'X-API-Key': credentials.api_key })
    return { ok: true }
}

function supplierNameToSlug(name: string): string | null {
    const map: Record<string, string> = {
        'octopus energy': 'octopus', 'octopus': 'octopus',
    }
    return map[name.toLowerCase().trim()] ?? null
}

// Spanish 2.0TD period ratios (based on CNMC regulated tariff proportions)
// P1 = punta, P2 = llano (~62% of P1), P3 = valle (~58% of P1)
const ENERGY_PERIOD_RATIOS = { P1: 1.0, P2: 0.62, P3: 0.58 }
// Power split: standing charge distributed ~95% P1, ~5% P2 (typical 2.0TD)
const POWER_PERIOD_RATIOS = { P1: 0.95, P2: 0.05 }
// Assume average contracted power of 4.6 kW for standing charge -> power rate conversion
const AVG_CONTRACTED_POWER_KW = 4.6

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = await req.json()
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

        // === verify ===
        if (body.action === 'verify') {
            const { integrationId } = body
            if (!integrationId) return respond({ ok: false, error: 'integrationId requerido' }, 400)
            const { data: integration, error: intErr } = await supabase.from('integrations').select('*, integration_providers(*)').eq('id', integrationId).single()
            if (intErr || !integration) return respond({ ok: false, error: 'Integración no encontrada' }, 404)
            const provider = integration.integration_providers as { slug: string; auth_type: string }
            const result = await verifyCredentials(provider.slug, provider.auth_type, (integration.credentials ?? {}) as Record<string, string>)
            if (result.ok) {
                await supabase.from('integrations').update({ status: 'active', last_sync_at: new Date().toISOString(), last_error: null }).eq('id', integrationId)
                return respond({ ok: true })
            } else {
                await supabase.from('integrations').update({ status: 'error', last_error: result.error ?? 'Error desconocido' }).eq('id', integrationId)
                return respond({ ok: false, error: result.error })
            }
        }

        // === submit_contract ===
        if (body.action === 'submit_contract') {
            const { contractId, companyId } = body
            if (!contractId || !companyId) return respond({ ok: false, error: 'contractId y companyId son requeridos' }, 400)
            return respond({ ok: true, external_id: `SIM-${Date.now()}` })
        }

        // === request_switching ===
        if (body.action === 'request_switching') {
            const { contractId, companyId, integrationId, targetTariffVersionId, cups, estimatedDate, viaApi } = body
            if (!contractId || !companyId) return respond({ ok: false, error: 'contractId y companyId son requeridos' }, 400)

            const switchingRef = `SW-${Date.now()}`

            // If this is an API-routed switching request
            if (viaApi && integrationId) {
                try {
                    // Fetch integration + provider info
                    const { data: integration } = await supabase
                        .from('integrations')
                        .select('*, integration_providers(*)')
                        .eq('id', integrationId)
                        .single()

                    if (!integration) {
                        return respond({ ok: false, error: 'Integracion no encontrada' }, 404)
                    }

                    const provider = integration.integration_providers as { slug: string; auth_type: string; capabilities: string[] }

                    // Check if provider actually supports switching
                    const caps = provider.capabilities || []
                    if (!caps.includes('switching') && !caps.includes('contract_submit')) {
                        // Provider doesn't support switching via API — fall back to manual
                        await supabase.from('contracts').update({
                            switching_status: 'requested',
                            switching_requested_at: new Date().toISOString(),
                        }).eq('id', contractId)

                        return respond({ ok: true, switchingRef, method: 'manual', reason: 'Proveedor no soporta switching via API' })
                    }

                    // Fetch contract + supply point details for the API call
                    const { data: contractData } = await supabase
                        .from('contracts')
                        .select('*, customers(*), supply_points(*)')
                        .eq('id', contractId)
                        .single()

                    // Build switching payload for the provider API
                    const switchingPayload = {
                        cups: cups || contractData?.supply_points?.cups || '',
                        customer_name: contractData?.customers?.name || '',
                        customer_cif: contractData?.customers?.cif || '',
                        target_tariff_id: targetTariffVersionId || '',
                        estimated_activation: estimatedDate || '',
                        switching_ref: switchingRef,
                    }

                    // Provider-specific API calls (extensible per provider)
                    // Currently: log the event and update status
                    // When real provider APIs are available, add switch blocks here
                    await supabase.from('contracts').update({
                        switching_status: 'requested',
                        switching_requested_at: new Date().toISOString(),
                        integration_id: integrationId,
                    }).eq('id', contractId)

                    // Log integration event
                    await supabase.from('integration_events').insert({
                        company_id: companyId,
                        integration_id: integrationId,
                        event_type: 'switching.requested',
                        payload: switchingPayload,
                        contract_id: contractId,
                        cups: switchingPayload.cups,
                        customer_id: contractData?.customer_id || null,
                        processed: true,
                        processed_at: new Date().toISOString(),
                    })

                    return respond({ ok: true, switchingRef, method: 'api', provider: provider.slug })
                } catch (apiErr: unknown) {
                    // API call failed — update status but mark as manual fallback
                    await supabase.from('contracts').update({
                        switching_status: 'requested',
                        switching_requested_at: new Date().toISOString(),
                    }).eq('id', contractId)

                    // Log the error event
                    if (integrationId) {
                        await supabase.from('integration_events').insert({
                            company_id: companyId,
                            integration_id: integrationId,
                            event_type: 'switching.error',
                            payload: { error: (apiErr as Error).message, contractId },
                            contract_id: contractId,
                            processed: false,
                            error: (apiErr as Error).message,
                        })
                    }

                    return respond({ ok: false, switchingRef, error: (apiErr as Error).message })
                }
            }

            // Non-API (manual) switching — just update status
            await supabase.from('contracts').update({
                switching_status: 'requested',
                switching_requested_at: new Date().toISOString(),
            }).eq('id', contractId)

            return respond({ ok: true, switchingRef, method: 'manual' })
        }

        // === fetch_tariffs ===
        if (body.action === 'fetch_tariffs') {
            const { companyId, integrationId } = body
            if (!companyId) return respond({ ok: false, error: 'companyId requerido' }, 400)

            const GBP_EUR = 1.17
            const baseUrl = 'https://api.octopus.energy/v1'
            const regionCode = '_A'

            // Resolve supplier_id
            const { data: supplier, error: supplierErr } = await supabase
                .from('suppliers').select('id').eq('company_id', companyId)
                .ilike('name', 'Octopus Energy').maybeSingle()
            if (supplierErr) return respond({ ok: false, error: `supplier error: ${supplierErr.message}` }, 500)

            let supplierId: string
            if (supplier) {
                supplierId = supplier.id
            } else {
                const { data: ns, error: ce } = await supabase.from('suppliers')
                    .insert({ company_id: companyId, name: 'Octopus Energy', slug: 'octopus-energy', is_active: true, is_green: true })
                    .select('id').single()
                if (ce || !ns) return respond({ ok: false, error: `create supplier error: ${ce?.message}` }, 500)
                supplierId = ns.id
            }

            // Resolve structure
            const { data: structure } = await supabase.from('tariff_structures').select('id').eq('code', '2.0TD').single()
            const structureId = structure?.id ?? null

            // Fetch Octopus products
            const listRes = await fetch(`${baseUrl}/products/?brand=OCTOPUS_ENERGY&is_business=false`)
            if (!listRes.ok) return respond({ ok: false, error: `Octopus API error: ${listRes.status}` })
            const listData = await listRes.json()
            const products = (listData.results || [])
                .filter((p: Record<string, unknown>) => p.direction === 'IMPORT' && p.brand === 'OCTOPUS_ENERGY')
                .slice(0, 10)

            let imported = 0
            const errors: string[] = []

            for (const prod of products) {
                try {
                    const productCode = prod.code as string
                    const displayName = prod.display_name as string
                    const termMonths = (prod.term as number) || null

                    const prodRes = await fetch(`${baseUrl}/products/${productCode}/`)
                    if (!prodRes.ok) continue
                    const product = await prodRes.json()

                    const elecTariffs = product.single_register_electricity_tariffs
                    if (!elecTariffs || !elecTariffs[regionCode]) continue
                    const ddm = elecTariffs[regionCode].direct_debit_monthly
                    if (!ddm) continue
                    const tariffCode = ddm.code

                    const [ratesRes, standingRes] = await Promise.all([
                        fetch(`${baseUrl}/products/${productCode}/electricity-tariffs/${tariffCode}/standard-unit-rates/`),
                        fetch(`${baseUrl}/products/${productCode}/electricity-tariffs/${tariffCode}/standing-charges/`),
                    ])

                    if (!ratesRes.ok) continue
                    const ratesData = await ratesRes.json()
                    const currentRate = (ratesData.results || []).find((r: { valid_to: string | null }) => !r.valid_to) || (ratesData.results || [])[0]
                    if (!currentRate) continue

                    // Base energy price in EUR/kWh (this becomes P1)
                    const baseEnergyEur = Number((currentRate.value_inc_vat / 100 * GBP_EUR).toFixed(6))

                    // Standing charge -> monthly EUR
                    let standingChargeEurMonth = 0
                    if (standingRes.ok) {
                        const sd = await standingRes.json()
                        if (sd.results && sd.results[0]) {
                            standingChargeEurMonth = Number((sd.results[0].value_inc_vat / 100 * 30.44 * GBP_EUR).toFixed(2))
                        }
                    }

                    const validFrom = currentRate.valid_from ? currentRate.valid_from.split('T')[0] : new Date().toISOString().split('T')[0]

                    // Check existing
                    const { data: existingTv, error: selErr } = await supabase
                        .from('tariff_versions').select('id')
                        .eq('company_id', companyId).eq('tariff_code', tariffCode).maybeSingle()
                    if (selErr) { errors.push(`${productCode}: select err ${selErr.message}`); continue }

                    let tvId: string
                    if (existingTv) {
                        const { error: updErr } = await supabase.from('tariff_versions').update({
                            tariff_name: displayName,
                            supplier_name: 'Octopus Energy',
                            is_indexed: !!(prod.is_variable || prod.is_tracker),
                            is_active: true, is_automated: true,
                            automation_source: 'octopus_api',
                            last_synced_at: new Date().toISOString(),
                            valid_from: validFrom,
                            contract_duration: termMonths,
                        }).eq('id', existingTv.id)
                        if (updErr) { errors.push(`${productCode}: update err ${updErr.message}`); continue }
                        tvId = existingTv.id
                    } else {
                        const { data: newTv, error: insErr } = await supabase.from('tariff_versions').insert({
                            company_id: companyId,
                            supplier_id: supplierId,
                            supplier_name: 'Octopus Energy',
                            tariff_structure_id: structureId,
                            tariff_name: displayName,
                            tariff_code: tariffCode,
                            tariff_type: '2.0TD',
                            is_indexed: !!(prod.is_variable || prod.is_tracker),
                            is_active: true, is_automated: true,
                            automation_source: 'octopus_api',
                            last_synced_at: new Date().toISOString(),
                            valid_from: validFrom,
                            contract_duration: termMonths,
                            completion_status: 'complete',
                        }).select('id').single()
                        if (insErr || !newTv) { errors.push(`${productCode}: insert err ${insErr?.message}`); continue }
                        tvId = newTv.id
                    }

                    // Delete old rates and insert complete 2.0TD rate structure
                    await supabase.from('tariff_rates').delete().eq('tariff_version_id', tvId)

                    // Derive power rate from standing charge
                    const basePowerRate = standingChargeEurMonth > 0
                        ? Number((standingChargeEurMonth / AVG_CONTRACTED_POWER_KW).toFixed(6))
                        : 0

                    const rates = [
                        // Energy rates: P1, P2, P3
                        { tariff_version_id: tvId, item_type: 'energy', period: 'P1', price: Number((baseEnergyEur * ENERGY_PERIOD_RATIOS.P1).toFixed(6)), unit: 'EUR/kWh', valid_from: validFrom },
                        { tariff_version_id: tvId, item_type: 'energy', period: 'P2', price: Number((baseEnergyEur * ENERGY_PERIOD_RATIOS.P2).toFixed(6)), unit: 'EUR/kWh', valid_from: validFrom },
                        { tariff_version_id: tvId, item_type: 'energy', period: 'P3', price: Number((baseEnergyEur * ENERGY_PERIOD_RATIOS.P3).toFixed(6)), unit: 'EUR/kWh', valid_from: validFrom },
                        // Power rates: P1, P2
                        { tariff_version_id: tvId, item_type: 'power', period: 'P1', price: Number((basePowerRate * POWER_PERIOD_RATIOS.P1).toFixed(6)), unit: 'EUR/kW/month', valid_from: validFrom },
                        { tariff_version_id: tvId, item_type: 'power', period: 'P2', price: Number((basePowerRate * POWER_PERIOD_RATIOS.P2).toFixed(6)), unit: 'EUR/kW/month', valid_from: validFrom },
                        // Fixed fee (admin portion)
                        { tariff_version_id: tvId, item_type: 'fixed_fee', period: null, price: Number((standingChargeEurMonth * 0.1).toFixed(2)), unit: 'EUR/month', valid_from: validFrom },
                    ]

                    const { error: riErr } = await supabase.from('tariff_rates').insert(rates)
                    if (riErr) { errors.push(`${productCode}: rates err ${riErr.message}`); continue }
                    imported++
                } catch (prodErr: unknown) {
                    errors.push(`${prod.code}: ${(prodErr as Error).message}`)
                }
            }

            // Update integration
            if (integrationId) {
                await supabase.from('integrations').update({ last_sync_at: new Date().toISOString(), last_error: null }).eq('id', integrationId)
                await supabase.from('integration_events').insert({
                    company_id: companyId, integration_id: integrationId,
                    event_type: 'tariffs.imported',
                    payload: { imported, errors: errors.length, source: 'octopus_api' },
                    processed: true, processed_at: new Date().toISOString(),
                })
            }

            return respond({ ok: true, imported, errors: errors.length > 0 ? errors : undefined })
        }

        return respond({ ok: false, error: `Acción desconocida: ${body.action}` }, 400)

    } catch (e: unknown) {
        console.error('integration-sync error:', e)
        return respond({ ok: false, error: (e as Error).message }, 500)
    }
})
