// @ts-nocheck
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
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
            const refreshToken = settings.google_refresh_token
            const emailFrom = settings.email_from
            if (!refreshToken || !emailFrom) throw new Error('Credenciales de Google (Gmail) no configuradas')

            // 1. Get Access Token
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
                    client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            const tokenData = await tokenResponse.json();
            if (!tokenResponse.ok) throw new Error(`Google Auth error: ${JSON.stringify(tokenData)}`);

            const accessToken = tokenData.access_token;

            // 2. Construct MIME email (simplified)
            // Note: For attachments we'd need a multipart/mixed MIME generator
            // This is a simple html text version for now
            const emailStr = [
                `To: ${message.recipient_contact}`,
                `From: ${emailFrom}`,
                `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(message.subject || 'Sin asunto')))}?=`,
                "Content-Type: text/html; charset=utf-8",
                "",
                message.content
            ].join("\n");

            // Encode to base64url
            const encodedEmail = btoa(unescape(encodeURIComponent(emailStr)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            // 3. Send via Gmail API
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    raw: encodedEmail
                }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(`Gmail API error: ${JSON.stringify(result)}`)

            // Update message status
            await supabaseClient
                .from('messages')
                .update({ status: 'sent', sent_at: new Date().toISOString(), provider_id: result.id })
                .eq('id', messageId)

        } else if (message.channel === 'whatsapp') {
            const waToken = settings.whatsapp_token
            const waPhoneId = settings.whatsapp_phone_number_id

            if (!waToken || !waPhoneId) throw new Error('WhatsApp credentials missing in company settings')

            // Normalize phone number to international format (E.164 without +)
            let phone = (message.recipient_contact || '').replace(/[\s\-\(\)\+]/g, '')
            // If it doesn't start with a country code, assume Spain (34)
            if (phone.startsWith('0')) {
                phone = '34' + phone.slice(1)
            } else if (!phone.startsWith('34') && phone.length === 9) {
                phone = '34' + phone
            }

            console.log(`[WhatsApp] Original: "${message.recipient_contact}" -> Normalized: "${phone}"`)

            const response = await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${waToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: phone,
                    type: "text",
                    text: { body: message.content }
                }),
            })

            const result = await response.json()
            console.log(`[WhatsApp] API response:`, JSON.stringify(result))
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

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error('Error sending message:', errorMessage);

        // Mark message as failed if we have a messageId
        try {
            const { messageId } = await req.clone().json().catch(() => ({ messageId: null }));
            if (messageId) {
                const supabaseClient = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )
                await supabaseClient
                    .from('messages')
                    .update({ status: 'failed' })
                    .eq('id', messageId)
            }
        } catch (updateErr) {
            console.error('Failed to update message status:', updateErr);
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
