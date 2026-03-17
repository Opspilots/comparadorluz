import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

/** Verify Resend/Svix webhook signature using HMAC-SHA256 */
async function verifyWebhookSignature(
    payload: string,
    headers: Headers,
    secret: string
): Promise<boolean> {
    const svixId = headers.get('svix-id')
    const svixTimestamp = headers.get('svix-timestamp')
    const svixSignature = headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) return false

    // Reject timestamps older than 5 minutes to prevent replay attacks
    const timestampSeconds = parseInt(svixTimestamp, 10)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestampSeconds) > 300) return false

    // Decode the secret (Resend uses whsec_ prefix with base64 payload)
    const secretBytes = Uint8Array.from(
        atob(secret.startsWith('whsec_') ? secret.slice(6) : secret),
        c => c.charCodeAt(0)
    )

    const signedContent = `${svixId}.${svixTimestamp}.${payload}`
    const key = await crypto.subtle.importKey(
        'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const signatureBytes = new Uint8Array(
        await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
    )
    const expectedSig = btoa(String.fromCharCode(...signatureBytes))

    // Svix sends multiple signatures separated by spaces, each prefixed with "v1,"
    // Use timing-safe comparison to prevent timing oracle attacks
    const expectedBytes = new TextEncoder().encode(expectedSig)
    const signatures = svixSignature.split(' ')
    return signatures.some(sig => {
        const sigValue = sig.startsWith('v1,') ? sig.slice(3) : sig
        const sigBytes = new TextEncoder().encode(sigValue)
        if (sigBytes.length !== expectedBytes.length) return false
        let diff = 0
        for (let i = 0; i < sigBytes.length; i++) diff |= sigBytes[i] ^ expectedBytes[i]
        return diff === 0
    })
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify webhook signature — mandatory
        const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
        if (!webhookSecret) {
            console.error('RESEND_WEBHOOK_SECRET not configured — rejecting all requests')
            return new Response(JSON.stringify({ error: 'Webhook signature verification not configured' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        const rawBody = await req.text()
        const isValid = await verifyWebhookSignature(rawBody, req.headers, webhookSecret)
        if (!isValid) {
            console.error('Invalid webhook signature — rejecting request')
            return new Response(JSON.stringify({ error: 'Invalid signature' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Parse Resend Webhook Payload
        const payload = JSON.parse(rawBody)
        console.log('Received email payload:', JSON.stringify(payload))

        // Basic validation of Resend payload structure
        // Resend sends a JSON with 'from', 'to', 'subject', 'text', 'html'
        const fromEmail = payload.from
        const subject = payload.subject
        const textBody = payload.text

        if (!fromEmail || !textBody) {
            console.log('Invalid payload, missing from or text')
            // Return 200 to acknowledge receipt even if invalid to prevent retries
            return new Response(JSON.stringify({ received: true, status: 'ignored_invalid_payload' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Clean up from address (Resend format: "Name <email@domain.com>")
        const emailMatch = fromEmail.match(/<(.+)>/)
        const cleanFromEmail = emailMatch ? emailMatch[1] : fromEmail

        // 2. Find ALL contacts matching this email across tenants
        const { data: contacts } = await supabaseClient
            .from('contacts')
            .select('id, customer_id, company_id')
            .eq('email', cleanFromEmail)

        if (!contacts || contacts.length === 0) {
            console.log(`No contact found for email: ${cleanFromEmail}`)
            return new Response(JSON.stringify({ received: true, status: 'ignored_unknown_sender' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 3. Insert a message for EACH matching tenant (multi-tenant safe)
        for (const contact of contacts) {
            const { error: insertError } = await supabaseClient
                .from('messages')
                .insert({
                    company_id: contact.company_id,
                    customer_id: contact.customer_id,
                    contact_id: contact.id,
                    channel: 'email',
                    direction: 'inbound',
                    recipient_contact: cleanFromEmail,
                    content: textBody || 'HTML Content only',
                    subject: subject,
                    status: 'delivered',
                    created_at: new Date().toISOString()
                })

            if (insertError) {
                console.error(`Failed to insert message for company ${contact.company_id}: ${insertError.message}`)
            } else {
                console.log(`Inserted inbound email for contact ${contact.id} in company ${contact.company_id}`)
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e))
        console.error('Error processing email webhook:', error)
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Resend will retry on 500
        })
    }
})
