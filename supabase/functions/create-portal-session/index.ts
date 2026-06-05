// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { getCorsHeaders } from "../_shared/cors.ts"

/** Helper: call Stripe REST API with form-encoded body */
async function stripeRequest(
    path: string,
    method: string,
    params?: Record<string, string>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const url = `https://api.stripe.com/v1${path}`

    const res = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params ? new URLSearchParams(params).toString() : undefined,
    })

    const data = await res.json()
    return { ok: res.ok, status: res.status, data }
}

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── 1. Authenticate caller ──────────────────────────────────────────
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authorization required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const token = authHeader.replace('Bearer ', '')

        const supabaseAuth = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        )

        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ── 2. Get user's company_id ────────────────────────────────────────
        const { data: callerUser, error: userError } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (userError || !callerUser?.company_id) {
            return new Response(JSON.stringify({ error: 'El usuario no tiene empresa asociada' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        const companyId: string = callerUser.company_id

        // ── 3. Parse request body ───────────────────────────────────────────
        const body = await req.json()
        const { return_url } = body as { return_url: string }

        if (!return_url) {
            return new Response(JSON.stringify({ error: 'return_url es obligatorio' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // ── 4. Get company's Stripe customer ID ─────────────────────────────
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('stripe_customer_id')
            .eq('id', companyId)
            .single()

        if (companyError || !company) {
            return new Response(JSON.stringify({ error: 'Empresa no encontrada' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            })
        }

        if (!company.stripe_customer_id) {
            return new Response(JSON.stringify({ error: 'No tiene suscripción activa' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // ── 5. Create Stripe Customer Portal session ────────────────────────
        const portalRes = await stripeRequest('/billing_portal/sessions', 'POST', {
            customer: company.stripe_customer_id,
            return_url,
        })

        if (!portalRes.ok) {
            console.error('Stripe portal session error:', JSON.stringify(portalRes.data))
            return new Response(JSON.stringify({ error: 'Error al crear la sesión del portal de facturación' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 502,
            })
        }

        return new Response(JSON.stringify({ url: portalRes.data.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Error desconocido'
        console.error('create-portal-session error:', message)
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
