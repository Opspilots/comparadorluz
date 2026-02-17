import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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
            const body = await req.json()
            console.log('Received WhatsApp payload:', JSON.stringify(body))

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

                const from = message.from // e.g., "34600123456"
                const textBody = message.text?.body || '[Multimedia/Other]'
                const msgType = message.type

                // Find customer by phone (normalize by checking endsWith for safety against +34/0034)
                // We'll select contacts where phone matches roughly
                // Getting all contacts and filtering might be heavy if many contacts, but for now allows flexible matching
                // Better: exact match if we standardise phones.
                // We will try exact match first.

                const { data: contact, error: contactError } = await supabaseClient
                    .from('contacts')
                    .select('id, customer_id, company_id')
                    .or(`phone.eq.${from},phone.eq.+${from}`)
                    .maybeSingle()

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

    } catch (error) {
        console.error('Error processing WhatsApp webhook:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
