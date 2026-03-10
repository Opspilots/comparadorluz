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
// REE e-sios API helpers
// ---------------------------------------------------------------------------

const ESIOS_BASE = 'https://api.esios.ree.es'

// Key PVPC indicators
const INDICATORS = {
    PVPC_DEFAULT: 600,     // Precio Voluntario al Pequeño Consumidor (2.0TD default)
    PVPC_DISCRIMINACION: 601,  // PVPC con discriminacion horaria
    POOL_PRICE: 1001,      // Precio mercado spot (pool)
} as const

interface EsiosIndicatorValue {
    value: number           // EUR/MWh
    datetime: string        // ISO8601
    datetime_utc: string
    tz_time: string
    geo_id: number
    geo_name: string
}

async function fetchEsiosIndicator(
    token: string,
    indicatorId: number,
    startDate: string,  // YYYY-MM-DD
    endDate: string     // YYYY-MM-DD
): Promise<EsiosIndicatorValue[]> {
    const url = `${ESIOS_BASE}/indicators/${indicatorId}?start_date=${startDate}T00:00&end_date=${endDate}T23:59&geo_ids[]=8741`

    const res = await fetch(url, {
        headers: {
            'Authorization': `Token token=${token}`,
            'Accept': 'application/json; application/vnd.esios-api-v1+json',
            'Content-Type': 'application/json',
            'Host': 'api.esios.ree.es',
        },
    })

    if (!res.ok) {
        console.error(`market-data-sync: esios indicator ${indicatorId} failed ${res.status}`)
        return []
    }

    const data = await res.json() as {
        indicator: {
            values: EsiosIndicatorValue[]
        }
    }

    return data.indicator?.values ?? []
}

// ---------------------------------------------------------------------------
// REE REData API helpers (no auth required)
// ---------------------------------------------------------------------------

const REDATA_BASE = 'https://apidatos.ree.es'

interface REDataValue {
    value: number
    percentage: number
    datetime: string
}

interface REDataAttributes {
    title: string
    description: string
    type: string
    values: REDataValue[]
}

async function fetchREDataCategory(
    category: string,
    widget: string,
    startDate: string,
    endDate: string,
    timeTrunc: string = 'hour'
): Promise<REDataAttributes[]> {
    const url = `${REDATA_BASE}/es/datos/${category}/${widget}?start_date=${startDate}T00:00&end_date=${endDate}T23:59&time_trunc=${timeTrunc}`

    const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
    })

    if (!res.ok) {
        console.error(`market-data-sync: redata ${category}/${widget} failed ${res.status}`)
        return []
    }

    const data = await res.json() as {
        included: Array<{ attributes: REDataAttributes }>
    }

    return (data.included ?? []).map(item => item.attributes)
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = await req.json() as {
            action: 'fetch_pvpc' | 'fetch_pool' | 'fetch_demand' | 'fetch_generation' | 'verify'
            integrationId?: string
            companyId?: string
            date?: string       // YYYY-MM-DD (single day)
            startDate?: string  // YYYY-MM-DD
            endDate?: string    // YYYY-MM-DD
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ===================================================================
        // action: verify — check e-sios token or REData availability
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
                return respond({ ok: false, error: 'Integracion no encontrada' }, 404)
            }

            const provider = integration.integration_providers as { slug: string; auth_type: string }
            const creds = (integration.credentials ?? {}) as Record<string, string>

            if (provider.slug === 'ree-esios') {
                // Verify e-sios token by fetching today's PVPC
                const today = new Date().toISOString().split('T')[0]
                const values = await fetchEsiosIndicator(creds.api_key ?? '', INDICATORS.PVPC_DEFAULT, today, today)

                if (values.length > 0) {
                    await supabase
                        .from('integrations')
                        .update({ status: 'active', last_sync_at: new Date().toISOString(), last_error: null })
                        .eq('id', integrationId)
                    return respond({ ok: true })
                } else {
                    await supabase
                        .from('integrations')
                        .update({ status: 'error', last_error: 'Token de e-sios invalido o sin datos' })
                        .eq('id', integrationId)
                    return respond({ ok: false, error: 'Token invalido' })
                }
            }

            return respond({ ok: true })
        }

        // ===================================================================
        // action: fetch_pvpc — fetch PVPC prices from e-sios
        // ===================================================================
        if (body.action === 'fetch_pvpc') {
            const { integrationId, companyId } = body

            // Get token from integration or env
            let esiosToken = ''
            if (integrationId) {
                const { data: integration } = await supabase
                    .from('integrations')
                    .select('credentials')
                    .eq('id', integrationId)
                    .single()

                esiosToken = (integration?.credentials as Record<string, string> | null)?.api_key ?? ''
            }

            if (!esiosToken) {
                esiosToken = Deno.env.get('ESIOS_TOKEN') ?? ''
            }

            if (!esiosToken) {
                return respond({ ok: false, error: 'Token de e-sios no configurado' }, 400)
            }

            // Default: fetch today and tomorrow (if available)
            const today = new Date()
            const startDate = body.startDate ?? today.toISOString().split('T')[0]
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const endDate = body.endDate ?? tomorrow.toISOString().split('T')[0]

            // Fetch PVPC and pool prices in parallel
            const [pvpcValues, poolValues] = await Promise.all([
                fetchEsiosIndicator(esiosToken, INDICATORS.PVPC_DEFAULT, startDate, endDate),
                fetchEsiosIndicator(esiosToken, INDICATORS.POOL_PRICE, startDate, endDate),
            ])

            let imported = 0

            // Transform PVPC values
            if (pvpcValues.length > 0) {
                const pvpcRows = pvpcValues.map((v) => {
                    const dt = new Date(v.datetime_utc || v.datetime)
                    return {
                        price_date: dt.toISOString().split('T')[0],
                        hour: dt.getUTCHours(),
                        price_type: 'pvpc',
                        price_eur_mwh: Number(v.value.toFixed(4)),
                        geo_id: 'peninsular',
                        source: 'esios',
                        indicator_id: INDICATORS.PVPC_DEFAULT,
                    }
                })

                const { error } = await supabase
                    .from('market_prices')
                    .upsert(pvpcRows, { onConflict: 'price_date,hour,price_type,geo_id' })

                if (error) {
                    console.error('market-data-sync: pvpc upsert error', error)
                } else {
                    imported += pvpcRows.length
                }
            }

            // Transform pool values
            if (poolValues.length > 0) {
                const poolRows = poolValues.map((v) => {
                    const dt = new Date(v.datetime_utc || v.datetime)
                    return {
                        price_date: dt.toISOString().split('T')[0],
                        hour: dt.getUTCHours(),
                        price_type: 'pool',
                        price_eur_mwh: Number(v.value.toFixed(4)),
                        geo_id: 'peninsular',
                        source: 'esios',
                        indicator_id: INDICATORS.POOL_PRICE,
                    }
                })

                const { error } = await supabase
                    .from('market_prices')
                    .upsert(poolRows, { onConflict: 'price_date,hour,price_type,geo_id' })

                if (error) {
                    console.error('market-data-sync: pool upsert error', error)
                } else {
                    imported += poolRows.length
                }
            }

            // Log event if we have an integration context
            if (integrationId && companyId) {
                await supabase.from('integration_events').insert({
                    company_id: companyId,
                    integration_id: integrationId,
                    event_type: 'market_prices.imported',
                    payload: { imported, types: ['pvpc', 'pool'], period: `${startDate} - ${endDate}` },
                    processed: true,
                    processed_at: new Date().toISOString(),
                })

                await supabase
                    .from('integrations')
                    .update({ last_sync_at: new Date().toISOString(), last_error: null })
                    .eq('id', integrationId)
            }

            return respond({ ok: true, imported })
        }

        // ===================================================================
        // action: fetch_demand — fetch demand data from REData (no auth)
        // ===================================================================
        if (body.action === 'fetch_demand') {
            const today = new Date().toISOString().split('T')[0]
            const startDate = body.startDate ?? today
            const endDate = body.endDate ?? today

            const categories = await fetchREDataCategory('demanda', 'evolucion', startDate, endDate, 'hour')

            // Return raw data for the frontend to display
            return respond({
                ok: true,
                data: categories.map(cat => ({
                    title: cat.title,
                    type: cat.type,
                    values: cat.values.slice(0, 100), // Limit response size
                })),
            })
        }

        // ===================================================================
        // action: fetch_generation — fetch generation mix from REData
        // ===================================================================
        if (body.action === 'fetch_generation') {
            const today = new Date().toISOString().split('T')[0]
            const startDate = body.startDate ?? today
            const endDate = body.endDate ?? today

            const categories = await fetchREDataCategory('generacion', 'estructura-generacion', startDate, endDate, 'hour')

            return respond({
                ok: true,
                data: categories.map(cat => ({
                    title: cat.title,
                    type: cat.type,
                    values: cat.values.slice(0, 100),
                })),
            })
        }

        return respond({ ok: false, error: `Accion desconocida: ${body.action}` }, 400)

    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.error('market-data-sync: unhandled error', err)
        return respond({ ok: false, error: err.message }, 500)
    }
})
