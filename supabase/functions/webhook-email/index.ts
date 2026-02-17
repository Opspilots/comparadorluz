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

        // 1. Parse Resend Webhook Payload
        const payload = await req.json()
        console.log('Received email payload:', JSON.stringify(payload))

        // Basic validation of Resend payload structure
        // Resend sends a JSON with 'from', 'to', 'subject', 'text', 'html'
        const fromEmail = payload.from
        const toEmail = payload.to
        const subject = payload.subject
        const textBody = payload.text
        const htmlBody = payload.html

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

        // 2. Find Customer by Email
        // Search in 'contacts' table first, then 'companies' (if B2B), or maybe 'customers' directly if they have email field (they do on contacts)
        // We will search in `contacts` table
        const { data: contact, error: contactError } = await supabaseClient
            .from('contacts')
            .select('id, customer_id, company_id')
            .eq('email', cleanFromEmail)
            .maybeSingle()

        let customerId: string | null = null
        let companyId: string | null = null
        let contactId: string | null = null

        if (contact) {
            customerId = contact.customer_id
            companyId = contact.company_id
            contactId = contact.id
            console.log(`Found contact: ${contact.id} for customer: ${contact.customer_id}`)
        } else {
            // Fallback: Check if there is a company user or just log it as unknown
            console.log(`No contact found for email: ${cleanFromEmail}`)
            // Ideally we should create a lead or store it as 'unknown', but for now we might fail or store with null customer?
            // The 'messages' table likely requires customer_id.
            // Let's try to find a customer by company email if applicable, or just generic search
            // For now, if no customer found, we cannot attach it to a thread cleanly.
            // We will return 200 but log error.

            // OPTIONAL: Create a "Lead" or "Unknown" customer?
            // For this MVP, we will only process messages from known contacts.
            return new Response(JSON.stringify({ received: true, status: 'ignored_unknown_sender' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 3. Insert Message
        const { error: insertError } = await supabaseClient
            .from('messages')
            .insert({
                company_id: companyId,
                customer_id: customerId,
                contact_id: contactId,
                channel: 'email',
                direction: 'inbound',
                recipient_contact: cleanFromEmail, // The sender
                content: textBody || 'HTML Content only', // Prefer text, fallback to placeholder
                subject: subject,
                status: 'delivered', // It reached us
                created_at: new Date().toISOString()
            })

        if (insertError) {
            throw new Error(`Failed to insert message: ${insertError.message}`)
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Error processing email webhook:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Resend will retry on 500
        })
    }
})
