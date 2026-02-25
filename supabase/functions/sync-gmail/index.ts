// @ts-nocheck
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // This function can be called by a cron job or a manual trigger to sync recent emails for a specific company or all companies.

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        const supabaseClient = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch companies that have Gmail Connected (google_refresh_token exists)
        const { data: companies, error: cmpError } = await supabaseClient
            .from('companies')
            .select('id, messaging_settings')
            .not('messaging_settings->google_refresh_token', 'is', null)

        if (cmpError) throw cmpError;

        let totalSynced = 0;

        for (const company of companies || []) {
            const settings = company.messaging_settings;
            if (!settings.google_refresh_token) continue;

            try {
                // 2. Refresh Google Access Token
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
                        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
                        refresh_token: settings.google_refresh_token,
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
                    const headers = msgDetail.payload.headers;
                    const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
                    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'Sin asunto';

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
                            const part = msgDetail.payload.parts.find((p: any) => p.mimeType === 'text/plain' || p.mimeType === 'text/html');
                            if (part && part.body.data) {
                                // Google returns base64url encoded strings
                                const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                                bodyText = atob(base64); // Ideally use a robust decode for UTF8
                            }
                        } else if (msgDetail.payload.body?.data) {
                            const base64 = msgDetail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
                            bodyText = atob(base64);
                        }

                        // Check if we already have this message (provider_id = gmail message id)
                        const { data: existingMsg } = await supabaseClient
                            .from('messages')
                            .select('id')
                            .eq('provider_id', msg.id)
                            .maybeSingle();

                        if (!existingMsg) {
                            // Insert into internal DB
                            await supabaseClient.from('messages').insert({
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
                            });

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

        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
