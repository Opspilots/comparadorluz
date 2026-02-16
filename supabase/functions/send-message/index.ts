import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { messageId } = await req.json()

        // 1. Fetch message data
        const { data: message, error: messageError } = await supabaseClient
            .from('messages')
            .select('*, companies(messaging_settings)')
            .eq('id', messageId)
            .single()

        if (messageError || !message) {
            throw new Error(`Message not found: ${messageError?.message}`)
        }

        const settings = message.companies?.messaging_settings || {}

        // 2. Route by channel
        if (message.channel === 'email') {
            const resendApiKey = settings.resend_api_key
            if (!resendApiKey) throw new Error('Resend API key missing in company settings')

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey}`,
                },
                body: JSON.stringify({
                    from: settings.email_from || 'noreply@yourdomain.com',
                    to: [message.recipient_contact],
                    subject: message.subject || 'Sin asunto',
                    html: message.content,
                    attachments: message.attachments?.map((att: any) => ({
                        filename: att.name,
                        path: att.url,
                    }))
                }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(`Resend error: ${JSON.stringify(result)}`)

            // Update message status
            await supabaseClient
                .from('messages')
                .update({ status: 'sent', sent_at: new Date().toISOString(), provider_id: result.id })
                .eq('id', messageId)

        } else if (message.channel === 'whatsapp') {
            const waToken = settings.whatsapp_token
            const waPhoneId = settings.whatsapp_phone_number_id

            if (!waToken || !waPhoneId) throw new Error('WhatsApp credentials missing in company settings')

            const response = await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${waToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: message.recipient_contact,
                    type: "text",
                    text: { body: message.content }
                }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(`WhatsApp error: ${JSON.stringify(result)}`)

            // Update message status
            await supabaseClient
                .from('messages')
                .update({ status: 'sent', sent_at: new Date().toISOString(), provider_id: result.messages[0].id })
                .eq('id', messageId)
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
