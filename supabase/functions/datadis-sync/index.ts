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
// Datadis API helpers
// ---------------------------------------------------------------------------

const DATADIS_BASE = 'https://datadis.es'

async function datadisLogin(username: string, password: string): Promise<string | null> {
    try {
        const res = await fetch(`${DATADIS_BASE}/nikola-auth/tokens/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username, password }),
        })

        if (!res.ok) {
            console.error(`datadis-sync: login failed ${res.status}`)
            return null
        }

        const token = await res.text()
        return token.trim()
    } catch (e) {
        console.error('datadis-sync: login error', e)
        return null
    }
}

interface DatadisSupply {
    cups: string
    address: string
    postalCode: string
    province: string
    municipality: string
    distributor: string
    validDateFrom: string
    validDateTo: string
    pointType: number
}

async function datadisGetSupplies(token: string, nif: string): Promise<DatadisSupply[]> {
    const params = new URLSearchParams({ authorizedNif: nif })
    const res = await fetch(`${DATADIS_BASE}/api-private/api/get-supplies?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
        console.error(`datadis-sync: get-supplies failed ${res.status}`)
        return []
    }

    return await res.json() as DatadisSupply[]
}

interface DatadisConsumption {
    cups: string
    date: string       // dd/MM/yyyy
    time: string       // HH:mm
    consumptionKWh: number
    obtainMethod: string
}

async function datadisGetConsumption(
    token: string,
    cups: string,
    distributorCode: string,
    startDate: string, // yyyy/MM
    endDate: string,   // yyyy/MM
    measurementType: number, // 0 = hourly, 1 = quarter-hourly
    pointType: number
): Promise<DatadisConsumption[]> {
    const params = new URLSearchParams({
        cups,
        distributorCode,
        startDate,
        endDate,
        measurementType: String(measurementType),
        pointType: String(pointType),
    })

    const res = await fetch(`${DATADIS_BASE}/api-private/api/get-consumption-data?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
        console.error(`datadis-sync: get-consumption failed ${res.status} for ${cups}`)
        return []
    }

    return await res.json() as DatadisConsumption[]
}

interface DatadisMaxPower {
    cups: string
    date: string
    time: string
    maxPower: number
}

async function datadisGetMaxPower(
    token: string,
    cups: string,
    distributorCode: string,
    startDate: string,
    endDate: string
): Promise<DatadisMaxPower[]> {
    const params = new URLSearchParams({
        cups,
        distributorCode,
        startDate,
        endDate,
    })

    const res = await fetch(`${DATADIS_BASE}/api-private/api/get-max-power?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
        console.error(`datadis-sync: get-max-power failed ${res.status} for ${cups}`)
        return []
    }

    return await res.json() as DatadisMaxPower[]
}

// Distributor codes for Datadis
const DISTRIBUTOR_CODES: Record<string, string> = {
    'i-de': '1',
    'e-distribucion': '2',
    'ufd': '3',
    'viesgo': '4',
    'e-redes': '5',
}

function guessDistributorCode(distributorName: string): string {
    const lower = distributorName.toLowerCase()
    for (const [key, code] of Object.entries(DISTRIBUTOR_CODES)) {
        if (lower.includes(key)) return code
    }
    return '0' // Unknown
}

// Map Spanish hour period based on time
function getHourPeriod(hour: number): string {
    // 2.0TD periods (simplified: P1=punta, P2=llano, P3=valle)
    if (hour >= 10 && hour < 14) return 'P1'
    if (hour >= 18 && hour < 22) return 'P1'
    if ((hour >= 8 && hour < 10) || (hour >= 14 && hour < 18) || (hour >= 22 && hour < 24)) return 'P2'
    return 'P3' // 0-8
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = await req.json() as {
            action: 'verify' | 'fetch_supplies' | 'fetch_consumption' | 'fetch_max_power'
            integrationId?: string
            companyId?: string
            cups?: string
            startDate?: string  // yyyy/MM
            endDate?: string    // yyyy/MM
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Helper to load integration credentials
        async function loadIntegration(integrationId: string) {
            const { data, error } = await supabase
                .from('integrations')
                .select('*, integration_providers(*)')
                .eq('id', integrationId)
                .single()

            if (error || !data) return null
            return data as {
                id: string
                company_id: string
                credentials: Record<string, string> | null
                agent_config: Record<string, unknown>
                integration_providers: { slug: string; auth_type: string }
            }
        }

        // ===================================================================
        // action: verify — validate Datadis credentials
        // ===================================================================
        if (body.action === 'verify') {
            const { integrationId } = body
            if (!integrationId) return respond({ ok: false, error: 'integrationId requerido' }, 400)

            const integration = await loadIntegration(integrationId)
            if (!integration) return respond({ ok: false, error: 'Integracion no encontrada' }, 404)

            const creds = integration.credentials ?? {}
            const token = await datadisLogin(creds.username ?? '', creds.password ?? '')

            if (token) {
                await supabase
                    .from('integrations')
                    .update({ status: 'active', last_sync_at: new Date().toISOString(), last_error: null })
                    .eq('id', integrationId)
                return respond({ ok: true })
            } else {
                await supabase
                    .from('integrations')
                    .update({ status: 'error', last_error: 'Credenciales de Datadis invalidas' })
                    .eq('id', integrationId)
                return respond({ ok: false, error: 'Credenciales invalidas' })
            }
        }

        // ===================================================================
        // action: fetch_supplies — get supply points from Datadis
        // ===================================================================
        if (body.action === 'fetch_supplies') {
            const { integrationId, companyId } = body
            if (!integrationId || !companyId) {
                return respond({ ok: false, error: 'integrationId y companyId requeridos' }, 400)
            }

            const integration = await loadIntegration(integrationId)
            if (!integration) return respond({ ok: false, error: 'Integracion no encontrada' }, 404)

            const creds = integration.credentials ?? {}
            const token = await datadisLogin(creds.username ?? '', creds.password ?? '')
            if (!token) {
                await supabase
                    .from('integrations')
                    .update({ status: 'error', last_error: 'Error de autenticacion con Datadis' })
                    .eq('id', integrationId)
                return respond({ ok: false, error: 'Error de autenticacion' })
            }

            // Use the NIF/CIF from credentials or agent_config
            const nif = (creds.nif ?? creds.username ?? '') as string
            const supplies = await datadisGetSupplies(token, nif)

            // Find or create a default customer for this company to link supply points
            // We look for existing supply points first, then fall back to the first customer
            let linkedCustomerId: string | null = null

            // Check if any supply points already exist for this company
            const { data: existingSps } = await supabase
                .from('supply_points')
                .select('customer_id')
                .eq('company_id', companyId)
                .limit(1)

            if (existingSps && existingSps.length > 0) {
                linkedCustomerId = existingSps[0].customer_id
            } else {
                // Fall back to first customer of this company
                const { data: firstCustomer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('company_id', companyId)
                    .limit(1)

                if (firstCustomer && firstCustomer.length > 0) {
                    linkedCustomerId = firstCustomer[0].id
                }
            }

            // Persist supplies to supply_points table (upsert by CUPS)
            let persisted = 0
            if (linkedCustomerId && supplies.length > 0) {
                const spRows = supplies.map(s => ({
                    company_id: companyId,
                    customer_id: linkedCustomerId!,
                    cups: s.cups,
                    address: [s.address, s.municipality, s.province, s.postalCode].filter(Boolean).join(', '),
                    supply_type: 'electricity' as const,
                    distributor: s.distributor || null,
                    point_type: s.pointType || null,
                }))

                for (const row of spRows) {
                    const { error } = await supabase
                        .from('supply_points')
                        .upsert(row, { onConflict: 'company_id,cups' })

                    if (!error) persisted++
                    else console.error('datadis-sync: upsert supply_point error:', error.message)
                }
            }

            // Log event
            await supabase.from('integration_events').insert({
                company_id: companyId,
                integration_id: integrationId,
                event_type: 'supplies.fetched',
                payload: { count: supplies.length, persisted, nif },
                processed: true,
                processed_at: new Date().toISOString(),
            })

            await supabase
                .from('integrations')
                .update({ last_sync_at: new Date().toISOString(), last_error: null })
                .eq('id', integrationId)

            return respond({ ok: true, supplies, persisted })
        }

        // ===================================================================
        // action: fetch_consumption — get consumption data for a CUPS
        // ===================================================================
        if (body.action === 'fetch_consumption') {
            const { integrationId, companyId, cups, startDate, endDate } = body
            if (!integrationId || !companyId || !cups) {
                return respond({ ok: false, error: 'integrationId, companyId y cups requeridos' }, 400)
            }

            const integration = await loadIntegration(integrationId)
            if (!integration) return respond({ ok: false, error: 'Integracion no encontrada' }, 404)

            const creds = integration.credentials ?? {}
            const token = await datadisLogin(creds.username ?? '', creds.password ?? '')
            if (!token) {
                return respond({ ok: false, error: 'Error de autenticacion con Datadis' })
            }

            // Default to last 12 months
            const now = new Date()
            const defaultEnd = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
            const defaultStart = `${yearAgo.getFullYear()}/${String(yearAgo.getMonth() + 1).padStart(2, '0')}`

            const consumption = await datadisGetConsumption(
                token,
                cups,
                '0',  // auto-detect distributor
                startDate ?? defaultStart,
                endDate ?? defaultEnd,
                0,    // hourly
                5     // default point type
            )

            if (consumption.length === 0) {
                return respond({ ok: true, imported: 0, message: 'No se encontraron datos de consumo' })
            }

            // Transform and upsert into consumption_data
            const rows = consumption.map((c) => {
                // Parse date: dd/MM/yyyy -> yyyy-MM-dd
                const [day, month, year] = c.date.split('/')
                const isoDate = `${year}-${month}-${day}`

                // Parse hour from time: "HH:mm" -> number
                const hour = parseInt(c.time.split(':')[0], 10)

                return {
                    company_id: companyId,
                    cups: c.cups || cups,
                    date: isoDate,
                    hour,
                    consumption_kwh: c.consumptionKWh,
                    source: 'datadis',
                    period: getHourPeriod(hour),
                    method: c.obtainMethod || null,
                }
            })

            // Batch upsert in chunks of 500
            let imported = 0
            const chunkSize = 500
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize)
                const { error } = await supabase
                    .from('consumption_data')
                    .upsert(chunk, { onConflict: 'company_id,cups,date,hour,source' })

                if (error) {
                    console.error(`datadis-sync: upsert error at chunk ${i}:`, error)
                } else {
                    imported += chunk.length
                }
            }

            // Log event
            await supabase.from('integration_events').insert({
                company_id: companyId,
                integration_id: integrationId,
                event_type: 'consumption.imported',
                payload: { cups, imported, period: `${startDate ?? defaultStart} - ${endDate ?? defaultEnd}` },
                cups,
                processed: true,
                processed_at: new Date().toISOString(),
            })

            await supabase
                .from('integrations')
                .update({ last_sync_at: new Date().toISOString(), last_error: null })
                .eq('id', integrationId)

            return respond({ ok: true, imported })
        }

        // ===================================================================
        // action: fetch_max_power — get max power data for a CUPS
        // ===================================================================
        if (body.action === 'fetch_max_power') {
            const { integrationId, companyId, cups, startDate, endDate } = body
            if (!integrationId || !companyId || !cups) {
                return respond({ ok: false, error: 'integrationId, companyId y cups requeridos' }, 400)
            }

            const integration = await loadIntegration(integrationId)
            if (!integration) return respond({ ok: false, error: 'Integracion no encontrada' }, 404)

            const creds = integration.credentials ?? {}
            const token = await datadisLogin(creds.username ?? '', creds.password ?? '')
            if (!token) {
                return respond({ ok: false, error: 'Error de autenticacion con Datadis' })
            }

            const now = new Date()
            const defaultEnd = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
            const defaultStart = `${yearAgo.getFullYear()}/${String(yearAgo.getMonth() + 1).padStart(2, '0')}`

            const maxPowerData = await datadisGetMaxPower(
                token,
                cups,
                '0',
                startDate ?? defaultStart,
                endDate ?? defaultEnd
            )

            // Persist max power data — update the supply_point's max_demand_kw
            // with the highest recorded value
            let maxKw: number | null = null
            if (maxPowerData.length > 0) {
                maxKw = Math.max(...maxPowerData.map(d => d.maxPower))

                // Update the supply point with the max demand
                await supabase
                    .from('supply_points')
                    .update({ max_demand_kw: maxKw })
                    .eq('company_id', companyId)
                    .eq('cups', cups)
            }

            await supabase.from('integration_events').insert({
                company_id: companyId,
                integration_id: integrationId,
                event_type: 'max_power.fetched',
                payload: { cups, records: maxPowerData.length, max_kw: maxKw },
                cups,
                processed: true,
                processed_at: new Date().toISOString(),
            })

            return respond({ ok: true, data: maxPowerData, max_kw: maxKw })
        }

        return respond({ ok: false, error: `Accion desconocida: ${body.action}` }, 400)

    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.error('datadis-sync: unhandled error', err)
        return respond({ ok: false, error: err.message }, 500)
    }
})
