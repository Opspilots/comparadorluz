// deno-lint-ignore-file

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode as base64Encode } from "https://deno.land/std@0.192.0/encoding/base64.ts"

import { getCorsHeaders } from "../_shared/cors.ts"
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts"

/** Encode a UTF-8 string to base64url (RFC 4648 §5) */
function toBase64Url(str: string): string {
    const bytes = new TextEncoder().encode(str)
    return base64Encode(bytes)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

/** Encode a UTF-8 string to standard base64 (RFC 2045, with padding) */
function toStandardBase64(str: string): string {
    const bytes = new TextEncoder().encode(str)
    return base64Encode(bytes)
}

/** Encode raw bytes to standard base64 (RFC 2045, with padding) */
function bytesToStandardBase64(bytes: Uint8Array): string {
    return base64Encode(bytes)
}

/** Build a RFC 2045 multipart/mixed MIME message with optional attachments */
async function buildMimeEmail(
    from: string,
    to: string,
    subject: string,
    htmlBody: string,
    attachments?: { name: string; url: string; type: string; size: number }[]
): Promise<string> {
    const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`
    // For RFC 2047 encoded-word, use standard base64 (not base64url) to preserve padding
    const subjectBytes = new TextEncoder().encode(subject)
    const subjectBinaryStr = Array.from(subjectBytes).map(b => String.fromCharCode(b)).join('')
    const encodedSubject = `=?utf-8?B?${btoa(subjectBinaryStr)}?=`

    const headers = [
        `MIME-Version: 1.0`,
        `To: ${to}`,
        `From: ${from}`,
        `Subject: ${encodedSubject}`,
    ]

    const hasAttachments = attachments && attachments.length > 0

    if (!hasAttachments) {
        // Simple email without attachments
        headers.push(`Content-Type: text/html; charset=utf-8`)
        headers.push(`Content-Transfer-Encoding: base64`)
        headers.push('')
        headers.push(toStandardBase64(htmlBody))
        return headers.join('\r\n')
    }

    // Multipart email with attachments
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
    headers.push('')
    headers.push(`--${boundary}`)
    headers.push(`Content-Type: text/html; charset=utf-8`)
    headers.push(`Content-Transfer-Encoding: base64`)
    headers.push('')
    headers.push(toStandardBase64(htmlBody))

    const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024 // 25 MB
    const allowedUrlPrefix = `${Deno.env.get('SUPABASE_URL') ?? ''}/storage/v1/object/`
    for (const att of attachments) {
        try {
            if (att.size && att.size > MAX_ATTACHMENT_SIZE) {
                console.warn(`Adjunto omitido (${att.name}): ${(att.size / 1024 / 1024).toFixed(1)} MB excede el límite de 25 MB`)
                continue
            }
            // Validate attachment URL to prevent SSRF
            if (!att.url.startsWith(allowedUrlPrefix)) {
                console.warn(`Adjunto omitido (${att.name}): URL no permitida — solo se permiten archivos de Supabase Storage`)
                continue
            }
            const response = await fetch(att.url)
            if (!response.ok) {
                console.error(`Failed to fetch attachment ${att.name}: ${response.status}`)
                continue
            }
            const fileBytes = new Uint8Array(await response.arrayBuffer())
            const fileBase64 = bytesToStandardBase64(fileBytes)

            // Sanitize filename for Content-Disposition
            const safeName = att.name.replace(/["\r\n]/g, '_')

            headers.push(`--${boundary}`)
            headers.push(`Content-Type: ${att.type}; name="${safeName}"`)
            headers.push(`Content-Disposition: attachment; filename="${safeName}"`)
            headers.push(`Content-Transfer-Encoding: base64`)
            headers.push('')
            headers.push(fileBase64)
        } catch (err) {
            console.error(`Error processing attachment ${att.name}:`, err)
        }
    }

    headers.push(`--${boundary}--`)
    return headers.join('\r\n')
}

Deno.serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let parsedMessageId: string | null = null
    let verifiedCompanyId: string | null = null

    try {
        // Authenticate the caller
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
            return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get the user's company_id for tenant verification
        const { data: callerUser } = await supabaseClient
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (!callerUser?.company_id) {
            return new Response(JSON.stringify({ error: 'User has no associated company' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        verifiedCompanyId = callerUser.company_id

        // Rate limit: max 200 messages per hour per company
        const rl = await checkRateLimit({
            action: 'send-message',
            companyId: verifiedCompanyId,
            maxRequests: 200,
            windowSeconds: 3600,
        })
        if (!rl.allowed) {
            return rateLimitResponse(rl, corsHeaders)
        }

        const reqBody = await req.json()
        const { messageId } = reqBody

        // 1. Fetch message data — only set parsedMessageId AFTER tenant ownership is confirmed
        const { data: message, error: messageError } = await supabaseClient
            .from('messages')
            .select('*, companies(messaging_settings)')
            .eq('id', messageId)
            .eq('company_id', verifiedCompanyId)
            .single()

        if (messageError || !message) {
            throw new Error('Message not found or access denied')
        }

        // Only set parsedMessageId after ownership is confirmed
        parsedMessageId = messageId

        const settings = message.companies?.messaging_settings || {}

        // 2. Route by channel
        if (message.channel === 'email') {
            // Read OAuth tokens from secure table (service role bypasses RLS)
            const { data: oauthToken, error: oauthError } = await supabaseClient
                .from('company_oauth_tokens')
                .select('refresh_token, access_token, email')
                .eq('company_id', verifiedCompanyId)
                .single()

            if (oauthError || !oauthToken) {
                throw new Error('Credenciales de Google (Gmail) no configuradas')
            }

            const refreshToken = oauthToken.refresh_token
            const emailFrom = oauthToken.email || settings.email_from
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
            if (!tokenResponse.ok) {
                console.error('Google Auth error:', tokenData.error ?? tokenResponse.status);
                throw new Error('Error de autenticación con Google. Verifica las credenciales de Gmail.');
            }

            const accessToken = tokenData.access_token;

            // 2. Build MIME email with attachment support
            const mimeEmail = await buildMimeEmail(
                emailFrom,
                message.recipient_contact,
                message.subject || 'Sin asunto',
                message.content,
                message.attachments
            );

            // 3. Encode full MIME to base64url for Gmail API
            const encodedEmail = toBase64Url(mimeEmail);

            // 4. Send via Gmail API
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
            if (!response.ok) {
                console.error('Gmail API error details:', JSON.stringify(result));
                throw new Error('Error al enviar el email a través de Gmail.');
            }

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
            let phone = (message.recipient_contact || '').replace(/[\s\-()+]/g, '')
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
            console.log(`[WhatsApp] API response status: ${response.status}, messages: ${result.messages?.length ?? 0}`)
            if (!response.ok) {
                console.error('WhatsApp API error details:', JSON.stringify(result));
                throw new Error('Error al enviar el mensaje de WhatsApp.');
            }

            // Update message status — guard against missing messages array
            const providerId = result.messages?.[0]?.id ?? null
            await supabaseClient
                .from('messages')
                .update({ status: 'sent', sent_at: new Date().toISOString(), provider_id: providerId })
                .eq('id', messageId)
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error('Error sending message:', errorMessage);

        // Mark message as failed — only if ownership was already verified
        try {
            if (parsedMessageId && verifiedCompanyId) {
                const supabaseClient = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )
                await supabaseClient
                    .from('messages')
                    .update({ status: 'failed' })
                    .eq('id', parsedMessageId)
                    .eq('company_id', verifiedCompanyId)
            }
        } catch (updateErr) {
            console.error('Failed to update message status:', updateErr);
        }

        return new Response(JSON.stringify({ error: 'Error al enviar el mensaje. Consulta los logs para más detalles.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
