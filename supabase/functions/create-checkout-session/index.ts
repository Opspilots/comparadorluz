// deno-lint-ignore-file

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

Deno.serve(async (req: Request) => {
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
        const { plan_id, billing_interval, success_url, cancel_url } = body as {
            plan_id: string
            billing_interval: 'monthly' | 'yearly'
            success_url: string
            cancel_url: string
        }

        if (!plan_id || !billing_interval || !success_url || !cancel_url) {
            return new Response(JSON.stringify({ error: 'Faltan parámetros obligatorios' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        if (billing_interval !== 'monthly' && billing_interval !== 'yearly') {
            return new Response(JSON.stringify({ error: 'billing_interval debe ser monthly o yearly' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // ── 4. Get / create Stripe customer for the company ─────────────────
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id, name, stripe_customer_id')
            .eq('id', companyId)
            .single()

        if (companyError || !company) {
            return new Response(JSON.stringify({ error: 'Empresa no encontrada' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            })
        }

        let stripeCustomerId: string = company.stripe_customer_id ?? ''

        if (!stripeCustomerId) {
            // Create a new Stripe customer
            const customerRes = await stripeRequest('/customers', 'POST', {
                name: company.name ?? '',
                metadata: { company_id: companyId },
            })

            if (!customerRes.ok) {
                console.error('Stripe create customer error:', JSON.stringify(customerRes.data))
                return new Response(JSON.stringify({ error: 'Error al crear el cliente en Stripe' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 502,
                })
            }

            stripeCustomerId = customerRes.data.id as string

            // Persist the new customer ID
            const { error: updateErr } = await supabase
                .from('companies')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('id', companyId)

            if (updateErr) {
                console.error('Failed to save stripe_customer_id:', updateErr.message)
                // Non-fatal — continue with the session creation
            }
        }

        // ── 5. Get the Stripe price ID for the chosen plan ──────────────────
        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('id, stripe_price_monthly_id, stripe_price_yearly_id')
            .eq('id', plan_id)
            .single()

        if (planError || !plan) {
            return new Response(JSON.stringify({ error: 'Plan no encontrado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            })
        }

        const stripePriceId: string | null =
            billing_interval === 'monthly'
                ? (plan.stripe_price_monthly_id ?? null)
                : (plan.stripe_price_yearly_id ?? null)

        if (!stripePriceId) {
            return new Response(JSON.stringify({ error: 'Plan no tiene precio Stripe configurado' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // ── 6. Create the Stripe Checkout Session ───────────────────────────
        const sessionParams: Record<string, string> = {
            customer: stripeCustomerId,
            'payment_method_types[0]': 'card',
            mode: 'subscription',
            'line_items[0][price]': stripePriceId,
            'line_items[0][quantity]': '1',
            success_url,
            cancel_url,
            // Session-level metadata
            'metadata[company_id]': companyId,
            'metadata[plan_id]': plan_id,
            'metadata[billing_interval]': billing_interval,
            // Subscription-level metadata (propagated to the subscription object)
            'subscription_data[metadata][company_id]': companyId,
            'subscription_data[metadata][plan_id]': plan_id,
            'subscription_data[metadata][billing_interval]': billing_interval,
        }

        const sessionRes = await stripeRequest('/checkout/sessions', 'POST', sessionParams)

        if (!sessionRes.ok) {
            console.error('Stripe checkout session error:', JSON.stringify(sessionRes.data))
            return new Response(JSON.stringify({ error: 'Error al crear la sesión de pago en Stripe' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 502,
            })
        }

        return new Response(JSON.stringify({ url: sessionRes.data.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Error desconocido'
        console.error('create-checkout-session error:', message)
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
