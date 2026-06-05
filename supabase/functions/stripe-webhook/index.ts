// deno-lint-ignore-file
// No user auth — Stripe calls this directly with its own signature header.
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Stripe webhook signature verification ────────────────────────────────────
// Implements the same HMAC-SHA256 logic as the official Stripe library.
// Spec: https://stripe.com/docs/webhooks/signatures

async function verifyStripeSignature(
    rawBody: string,
    sigHeader: string,
    secret: string
): Promise<boolean> {
    try {
        // sigHeader format: "t=<timestamp>,v1=<sig1>,v1=<sig2>,..."
        const parts: Record<string, string[]> = {}
        for (const part of sigHeader.split(',')) {
            const idx = part.indexOf('=')
            if (idx === -1) continue
            const key = part.slice(0, idx)
            const val = part.slice(idx + 1)
            if (!parts[key]) parts[key] = []
            parts[key].push(val)
        }

        const timestamp = parts['t']?.[0]
        const signatures = parts['v1'] ?? []

        if (!timestamp || signatures.length === 0) return false

        // Reject replays older than 5 minutes
        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
            console.warn('Stripe webhook: replay attack — timestamp too old')
            return false
        }

        const signedPayload = `${timestamp}.${rawBody}`
        const keyBytes = new TextEncoder().encode(secret)
        const msgBytes = new TextEncoder().encode(signedPayload)

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )

        const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes)
        const computed = Array.from(new Uint8Array(sigBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')

        // Constant-time comparison to avoid timing attacks
        return signatures.some(sig => {
            if (sig.length !== computed.length) return false
            let diff = 0
            for (let i = 0; i < sig.length; i++) {
                diff |= sig.charCodeAt(i) ^ computed.charCodeAt(i)
            }
            return diff === 0
        })
    } catch (err) {
        console.error('Stripe signature verification error:', err)
        return false
    }
}

// ── Free plan lookup (cached per invocation) ─────────────────────────────────
let freePlanId: string | null = null

async function getFreePlanId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
    if (freePlanId) return freePlanId
    const { data } = await supabase
        .from('plans')
        .select('id')
        .eq('is_free', true)
        .limit(1)
        .single()
    freePlanId = data?.id ?? null
    return freePlanId
}

// ── Protected plans that should never be downgraded by Stripe events ─────────
const PROTECTED_PLAN_NAMES = ['early_adopter']

async function isProtectedPlan(supabase: ReturnType<typeof createClient>, companyId: string): Promise<boolean> {
    const { data } = await supabase
        .from('companies')
        .select('plans(name)')
        .eq('id', companyId)
        .single()
    const planName = (data?.plans as Record<string, unknown> | null)?.name as string | undefined
    return PROTECTED_PLAN_NAMES.includes(planName ?? '')
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    // Webhook endpoints should return 200 quickly — never redirect Stripe.
    // CORS is not needed here (Stripe is a server, not a browser).

    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200 })
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    const rawBody = await req.text()
    const sigHeader = req.headers.get('stripe-signature') ?? ''
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured')
        return new Response('Webhook secret not configured', { status: 500 })
    }

    const isValid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret)
    if (!isValid) {
        console.warn('Stripe webhook: invalid signature — rejecting request')
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    let event: Record<string, unknown>
    try {
        event = JSON.parse(rawBody)
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const eventType = event.type as string
    const eventData = (event.data as Record<string, unknown>).object as Record<string, unknown>

    console.log(`Stripe webhook received: ${eventType}`)

    try {
        switch (eventType) {

            // ── checkout.session.completed ──────────────────────────────────
            case 'checkout.session.completed': {
                const metadata = (eventData.metadata ?? {}) as Record<string, string>
                const { company_id, plan_id, billing_interval } = metadata
                const subscriptionId = eventData.subscription as string | null

                if (!company_id || !plan_id) {
                    console.warn('checkout.session.completed: missing metadata', metadata)
                    break
                }

                const { error } = await supabase
                    .from('companies')
                    .update({
                        plan_id,
                        stripe_subscription_id: subscriptionId ?? null,
                        billing_interval: billing_interval ?? null,
                        plan_expires_at: null,
                    })
                    .eq('id', company_id)

                if (error) {
                    console.error('checkout.session.completed DB update error:', error.message)
                } else {
                    console.log(`Company ${company_id} upgraded to plan ${plan_id} (${billing_interval})`)
                }
                break
            }

            // ── customer.subscription.updated ───────────────────────────────
            case 'customer.subscription.updated': {
                const subscriptionId = eventData.id as string
                const status = eventData.status as string

                const { data: company, error: lookupErr } = await supabase
                    .from('companies')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single()

                if (lookupErr || !company) {
                    console.warn(`customer.subscription.updated: no company found for subscription ${subscriptionId}`)
                    break
                }

                let updatePayload: Record<string, unknown> = {}

                if (status === 'active') {
                    updatePayload = { plan_expires_at: null }
                    console.log(`Subscription ${subscriptionId} is active — clearing plan_expires_at`)
                } else if (status === 'past_due' || status === 'unpaid') {
                    // Give a 7-day grace period before locking the account
                    const gracePeriod = new Date()
                    gracePeriod.setDate(gracePeriod.getDate() + 7)
                    updatePayload = { plan_expires_at: gracePeriod.toISOString() }
                    console.log(`Subscription ${subscriptionId} is ${status} — grace period set to ${gracePeriod.toISOString()}`)
                } else if (status === 'canceled') {
                    if (await isProtectedPlan(supabase, company.id)) {
                        updatePayload = { stripe_subscription_id: null }
                        console.log(`Subscription ${subscriptionId} canceled — company ${company.id} has protected plan, keeping it`)
                    } else {
                        const fallbackPlanId = await getFreePlanId(supabase)
                        updatePayload = {
                            plan_id: fallbackPlanId,
                            stripe_subscription_id: null,
                            plan_expires_at: null,
                        }
                        console.log(`Subscription ${subscriptionId} canceled — reverted to free plan`)
                    }
                } else {
                    console.log(`customer.subscription.updated: unhandled status "${status}" — no action taken`)
                }

                if (Object.keys(updatePayload).length > 0) {
                    const { error: updateErr } = await supabase
                        .from('companies')
                        .update(updatePayload)
                        .eq('id', company.id)

                    if (updateErr) {
                        console.error('customer.subscription.updated DB error:', updateErr.message)
                    }
                }
                break
            }

            // ── customer.subscription.deleted ───────────────────────────────
            case 'customer.subscription.deleted': {
                const subscriptionId = eventData.id as string

                const { data: company, error: lookupErr } = await supabase
                    .from('companies')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single()

                if (lookupErr || !company) {
                    console.warn(`customer.subscription.deleted: no company found for subscription ${subscriptionId}`)
                    break
                }

                if (await isProtectedPlan(supabase, company.id)) {
                    const { error: updateErr } = await supabase
                        .from('companies')
                        .update({ stripe_subscription_id: null })
                        .eq('id', company.id)
                    if (updateErr) {
                        console.error('customer.subscription.deleted DB error:', updateErr.message)
                    } else {
                        console.log(`Subscription ${subscriptionId} deleted — company ${company.id} has protected plan, keeping it`)
                    }
                } else {
                    const fallbackPlanId = await getFreePlanId(supabase)

                    const { error: updateErr } = await supabase
                        .from('companies')
                        .update({
                            plan_id: fallbackPlanId,
                            stripe_subscription_id: null,
                            plan_expires_at: null,
                        })
                        .eq('id', company.id)

                    if (updateErr) {
                        console.error('customer.subscription.deleted DB error:', updateErr.message)
                    } else {
                        console.log(`Subscription ${subscriptionId} deleted — company ${company.id} reverted to free plan`)
                    }
                }
                break
            }

            // ── invoice.payment_failed ───────────────────────────────────────
            case 'invoice.payment_failed': {
                const customerId = eventData.customer as string
                const invoiceId = eventData.id as string
                const attemptCount = eventData.attempt_count as number | undefined
                const amountDue = eventData.amount_due as number | undefined

                const { data: company } = await supabase
                    .from('companies')
                    .select('id, name')
                    .eq('stripe_customer_id', customerId)
                    .single()

                console.warn(
                    `invoice.payment_failed — ` +
                    `invoice: ${invoiceId}, ` +
                    `customer: ${customerId}, ` +
                    `company: ${company?.id ?? 'unknown'} (${company?.name ?? '—'}), ` +
                    `amount_due: ${amountDue != null ? (amountDue / 100).toFixed(2) + ' EUR' : 'unknown'}, ` +
                    `attempt: ${attemptCount ?? 'unknown'}`
                )
                // Future: send notification email to the company admin
                break
            }

            default:
                console.log(`Stripe webhook: unhandled event type "${eventType}" — ignoring`)
        }
    } catch (handlerErr: unknown) {
        const msg = handlerErr instanceof Error ? handlerErr.message : String(handlerErr)
        console.error(`Error handling Stripe event "${eventType}":`, msg)
        // Still return 200 — Stripe should not retry on logic errors
    }

    // Always respond 200 so Stripe marks the event as delivered
    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
    })
})
