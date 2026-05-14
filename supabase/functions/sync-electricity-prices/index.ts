
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const ESIOS_TOKEN = Deno.env.get('ESIOS_API_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const INDICATORS = [
    { id: 1013, name: 'PVPC P1 (Punta)' },
    { id: 1014, name: 'PVPC P2 (Llano)' },
    { id: 1015, name: 'PVPC P3 (Valle)' },
    { id: 1021, name: 'Mercado Diario (Pool)' }
]

Deno.serve(async (req: Request) => {
    // Cron-only endpoint — no CORS needed
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 405 })
    }

    try {
        // Only allow cron calls — reject anonymous callers
        // Prefer CRON_SECRET for auth; fall back to SERVICE_ROLE_KEY for backwards compatibility
        const authHeader = req.headers.get('Authorization')
        const cronSecret = Deno.env.get('CRON_SECRET')
        const expectedBearer = `Bearer ${cronSecret || SUPABASE_SERVICE_ROLE_KEY}`
        let isCronCall = false
        if (authHeader && authHeader.length === expectedBearer.length) {
            const a = new TextEncoder().encode(authHeader)
            const b = new TextEncoder().encode(expectedBearer)
            let diff = 0
            for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
            isCronCall = diff === 0
        }
        if (!isCronCall) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        if (!ESIOS_TOKEN) throw new Error('ESIOS_API_TOKEN is not configured')

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        const results = []
        for (const indicator of INDICATORS) {
            console.log(`Fetching indicator ${indicator.id} (${indicator.name})...`)

            const response = await fetch(`https://api.esios.ree.es/indicators/${indicator.id}`, {
                headers: {
                    'Accept': 'application/json; application/vnd.esios-api-v1+json',
                    'Content-Type': 'application/json',
                    'Authorization': `Token token="${ESIOS_TOKEN}"`
                }
            })

            if (!response.ok) {
                console.error(`Error fetching indicator ${indicator.id}: ${response.status} ${await response.text()}`)
                continue
            }

            const data = await response.json()
            const values = data.indicator.values

            // Log count
            console.log(`Received ${values.length} values for ${indicator.name}`)

            // Upsert prices into market_prices table
            // (electricity_market_prices was dropped and replaced by market_prices in 20260312200000)
            const priceEntries = values.map((val: { value: number; datetime: string; datetime_end: string }) => {
                const dt = new Date(val.datetime)
                const madridDate = dt.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }) // YYYY-MM-DD
                const madridHour = parseInt(dt.toLocaleString('en-US', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }), 10)
                const priceType = [1013, 1014, 1015].includes(indicator.id) ? 'pvpc' : 'pool'
                return {
                    price_date: madridDate,
                    hour: madridHour,
                    price_type: priceType,
                    price_eur_mwh: val.value,
                    geo_id: 'peninsular',
                    source: 'esios',
                    indicator_id: indicator.id,
                }
            })

            const { error } = await supabase
                .from('market_prices')
                .upsert(priceEntries, { onConflict: 'price_date,hour,price_type,geo_id' })

            if (error) console.error(`Error upserting ${indicator.name}:`, error)
            results.push({ indicator: indicator.name, count: values.length })
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('Sync error:', error.message)
        return new Response(JSON.stringify({ error: 'Error en la sincronización de precios.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
