// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { decode as base64Decode } from "https://deno.land/std@0.192.0/encoding/base64.ts"

/** Decode a base64url-encoded string to UTF-8 text */
function decodeBase64Url(data: string): string {
    // Convert base64url to standard base64
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = base64Decode(base64)
    return new TextDecoder('utf-8').decode(bytes)
}

import { getCorsHeaders } from "../_shared/cors.ts"

serve(async (req: Request) => {
    // This function can be called by a cron job or a manual trigger to sync recent emails for a specific company or all companies.
    const corsHeaders = getCorsHeaders(req)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Authenticate: require either CRON_SECRET or valid user JWT
        const authHeader = req.headers.get('Authorization')
        const cronSecret = Deno.env.get('CRON_SECRET')

        // Timing-safe comparison for cron secret to prevent timing attacks
        let isCronCall = false
        if (cronSecret && authHeader) {
            const expectedBearer = `Bearer ${cronSecret}`
            if (authHeader.length === expectedBearer.length) {
                const a = new TextEncoder().encode(authHeader)
                const b = new TextEncoder().encode(expectedBearer)
                let diff = 0
                for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
                isCronCall = diff === 0
            }
        }

        let callerCompanyId: string | null = null

        if (!isCronCall) {
            if (!authHeader) {
                return new Response(JSON.stringify({ error: 'Authorization required' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401,
                })
            }

            const token = authHeader.replace('Bearer ', '')
            const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
                global: { headers: { Authorization: `Bearer ${token}` } }
            })

            const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
            if (authError || !user) {
                return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401,
                })
            }

            const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()

            callerCompanyId = userData?.company_id || null
            if (!callerCompanyId) {
                return new Response(JSON.stringify({ error: 'User has no associated company' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 403,
                })
            }
        }

        const supabaseClient = createClient(supabaseUrl, supabaseKey)

        // Accept optional companyId — but non-cron callers are restricted to their own company
        let requestCompanyId: string | null = callerCompanyId
        if (isCronCall) {
            try {
                const body = await req.json()
                requestCompanyId = body.companyId || null
            } catch {
                // No body or invalid JSON — sync all companies (cron mode)
            }
        }

        // 1. Fetch companies that have Gmail connected (OAuth tokens in secure table)
        let query = supabaseClient
            .from('company_oauth_tokens')
            .select('company_id, refresh_token, email')
            .eq('provider', 'google')

        if (requestCompanyId) {
            query = query.eq('company_id', requestCompanyId)
        }

        const { data: oauthTokens, error: cmpError } = await query

        if (cmpError) throw cmpError;

        let totalSynced = 0;

        for (const tokenRow of oauthTokens || []) {
            const company = { id: tokenRow.company_id };
            if (!tokenRow.refresh_token) continue;

            try {
                // 2. Refresh Google Access Token
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
                        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
                        refresh_token: tokenRow.refresh_token,
                        grant_type: 'refresh_token'
                    })
                });

                const tokenData = await tokenResponse.json();

                if (!tokenResponse.ok) {
                    console.error(`Failed to refresh token for company ${company.id}:`, tokenData);
                    continue;
                }

                const accessToken = tokenData.access_token;

                // 3. Fetch recent messages from Gmail API
                // We ask for messages in the Inbox, newer than a few hours/days (or just the latest 10 for demo)
                const gmailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox label:unread&maxResults=20`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                const gmailData = await gmailResponse.json();

                if (!gmailData.messages || gmailData.messages.length === 0) {
                    continue; // No new messages
                }

                for (const msg of gmailData.messages) {
                    // Fetch full message details
                    const msgDetailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    const msgDetail = await msgDetailResponse.json();

                    // Extract headers
                    const headers = msgDetail.payload.headers as Array<{ name: string; value: string }>;
                    const fromHeader = headers.find((h) => h.name === 'From')?.value || '';
                    const subject = headers.find((h) => h.name === 'Subject')?.value || 'Sin asunto';

                    // Basic email regex to extract just the email address from "Name <email@domain.com>"
                    const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader.trim()];
                    const senderEmail = emailMatch[1]?.trim().toLowerCase();

                    if (!senderEmail) continue;

                    // 4. Check if sender exists in our contacts
                    const { data: contact } = await supabaseClient
                        .from('contacts')
                        .select('id, customer_id')
                        .eq('company_id', company.id)
                        .eq('email', senderEmail)
                        .maybeSingle();

                    if (contact) {
                        // Extract plain text body (simplified)
                        let bodyText = '';
                        if (msgDetail.payload.parts) {
                            const part = (msgDetail.payload.parts as Array<{ mimeType: string; body: { data?: string } }>).find((p) => p.mimeType === 'text/plain' || p.mimeType === 'text/html');
                            if (part && part.body.data) {
                                bodyText = decodeBase64Url(part.body.data);
                            }
                        } else if (msgDetail.payload.body?.data) {
                            bodyText = decodeBase64Url(msgDetail.payload.body.data);
                        }

                        // Check if we already have this message (provider_id = gmail message id) — scoped to company
                        const { data: existingMsg } = await supabaseClient
                            .from('messages')
                            .select('id')
                            .eq('provider_id', msg.id)
                            .eq('company_id', company.id)
                            .maybeSingle();

                        if (!existingMsg) {
                            // Insert into internal DB (upsert to handle race conditions with duplicate provider_id)
                            await supabaseClient.from('messages').upsert({
                                company_id: company.id,
                                customer_id: contact.customer_id,
                                contact_id: contact.id,
                                channel: 'email',
                                direction: 'inbound',
                                recipient_contact: senderEmail,
                                subject: subject,
                                content: bodyText || '[Contenido vacío o formato no soportado]',
                                status: 'delivered',
                                created_at: new Date(parseInt(msgDetail.internalDate)).toISOString(),
                                provider_id: msg.id
                            }, { onConflict: 'provider_id,company_id', ignoreDuplicates: true });

                            totalSynced++;

                            // Optional: Mark as read in Gmail so we don't process it again
                            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    removeLabelIds: ['UNREAD']
                                })
                            });
                        }
                    }
                }
            } catch (err) {
                console.error(`Error processing company ${company.id}:`, err);
            }
        }

        return new Response(JSON.stringify({ success: true, synced: totalSynced }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error('Error syncing gmail:', errorMessage);

        return new Response(JSON.stringify({ error: 'Error al sincronizar Gmail. Consulta los logs.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
