
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

import { getCorsHeaders } from "../_shared/cors.ts"

Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req)
    const { method } = req
    const url = new URL(req.url)

    if (method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // --- 1. Verification Challenge (GET) ---
        if (method === 'GET') {
            const mode = url.searchParams.get('hub.mode')
            const token = url.searchParams.get('hub.verify_token')
            const challenge = url.searchParams.get('hub.challenge')

            const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')

            if (mode && token) {
                if (mode === 'subscribe' && token === verifyToken) {
                    console.log('WEBHOOK_VERIFIED')
                    return new Response(challenge, { status: 200 })
                } else {
                    return new Response('Forbidden', { status: 403 })
                }
            }
            return new Response('Bad Request', { status: 400 })
        }

        // --- 2. Inbound Messages (POST) ---
        if (method === 'POST') {
            // Verify Meta webhook signature (X-Hub-Signature-256)
            const signature = req.headers.get('X-Hub-Signature-256')
            const appSecret = Deno.env.get('WHATSAPP_APP_SECRET')

            if (!appSecret) {
                console.error('WHATSAPP_APP_SECRET is not configured — rejecting webhook')
                return new Response(JSON.stringify({ error: 'Webhook signature verification not configured' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                })
            }

            if (!signature) {
                console.error('Missing X-Hub-Signature-256 header')
                return new Response('Forbidden', { status: 403 })
            }

            const bodyText = await req.text()
            const key = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(appSecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            )
            const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyText))
            const expectedSig = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

            // Timing-safe comparison to prevent timing oracle attacks
            const sigBytes = new TextEncoder().encode(signature)
            const expBytes = new TextEncoder().encode(expectedSig)
            let sigDiff = sigBytes.length !== expBytes.length ? 1 : 0
            for (let i = 0; i < expBytes.length; i++) sigDiff |= (sigBytes[i] ?? 0) ^ expBytes[i]
            if (sigDiff !== 0) {
                console.error('Invalid webhook signature')
                return new Response('Forbidden', { status: 403 })
            }

            const body = JSON.parse(bodyText)

            const msgCount = body.entry?.[0]?.changes?.[0]?.value?.messages?.length ?? 0
            const senderType = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type ?? 'unknown'
            console.log(`Received WhatsApp webhook: ${msgCount} message(s), type: ${senderType}`)

            // Check if it's a valid WhatsApp message
            const entry = body.entry?.[0]
            const changes = entry?.changes?.[0]
            const value = changes?.value
            const message = value?.messages?.[0]

            if (message) {
                const supabaseClient = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )

                const rawFrom = message.from // e.g., "34600123456"
                const textBody = message.text?.body || '[Multimedia/Other]'

                // Sanitize phone number to digits only (prevent PostgREST filter injection)
                const from = rawFrom.replace(/[^\d]/g, '')
                if (!from || from.length < 7 || from.length > 15) {
                    console.warn(`Invalid 'from' phone format: ${rawFrom}`)
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    })
                }

                // Find customer by phone — try multiple phone format variants
                // Numbers may be stored with or without country code prefix
                const phoneVariants: string[] = [from, `+${from}`]
                // If number starts with country code (e.g., 34 for Spain), also try without it
                if (from.length > 9 && from.startsWith('34')) {
                    phoneVariants.push(from.slice(2), `+${from.slice(2)}`)
                }

                // Use parameterized .in() instead of string-concatenated .or()
                // to prevent PostgREST filter injection
                const { data: contacts } = await supabaseClient
                    .from('contacts')
                    .select('id, customer_id, company_id')
                    .in('phone', phoneVariants)
                    .limit(1)
                const contact = contacts?.[0] ?? null

                if (contact) {
                    const { error: insertError } = await supabaseClient
                        .from('messages')
                        .insert({
                            company_id: contact.company_id,
                            customer_id: contact.customer_id,
                            contact_id: contact.id,
                            channel: 'whatsapp',
                            direction: 'inbound',
                            recipient_contact: from, // The sender phone
                            content: textBody,
                            status: 'delivered',
                            created_at: new Date().toISOString(),
                            // Store metadata?
                            provider_id: message.id
                        })

                    if (insertError) {
                        console.error('Error inserting message:', insertError)
                        throw insertError
                    }
                } else {
                    console.log(`No contact found for WhatsApp number: ${from}`)
                    // Optional: Create lead logic here
                    // For now, return 200 to acknowledge Meta (otherwise they retry)
                }
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response('Method Not Allowed', { status: 405 })

    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e))
        console.error('Error processing WhatsApp webhook:', error)
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
