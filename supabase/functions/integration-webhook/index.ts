import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Always return 200 to the provider so it doesn't retry
    const respond = (body: Record<string, unknown>, status = 200) =>
        new Response(JSON.stringify(body), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status,
        })

    try {
        const url = new URL(req.url)
        const providerSlug = url.searchParams.get('provider')
        const companyId = url.searchParams.get('company_id')

        if (!providerSlug || !companyId) {
            console.warn('integration-webhook: missing provider or company_id')
            return respond({ received: true, status: 'ignored_missing_params' })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse payload
        let payload: Record<string, unknown> = {}
        try {
            payload = await req.json()
        } catch {
            console.warn('integration-webhook: invalid JSON body')
            return respond({ received: true, status: 'ignored_invalid_json' })
        }

        const eventType = (payload.event_type as string) ?? (payload.type as string) ?? 'unknown'

        // Find active integration for this company + provider
        const { data: integration, error: intErr } = await supabaseClient
            .from('integrations')
            .select('id, company_id, provider_id, integration_providers!inner(slug)')
            .eq('company_id', companyId)
            .eq('status', 'active')
            .eq('integration_providers.slug', providerSlug)
            .maybeSingle()

        if (intErr || !integration) {
            console.warn(`integration-webhook: no active integration for company=${companyId} provider=${providerSlug}`)
            // Still 200 — don't expose our internal state to the provider
            return respond({ received: true, status: 'ignored_no_active_integration' })
        }

        // Derive optional contract / customer / CUPS from payload
        const externalContractId = payload.contract_id as string | undefined
        const cups = (payload.cups ?? payload.supply_point_id) as string | undefined

        // Insert event record (unprocessed)
        const { data: eventRecord, error: eventInsertErr } = await supabaseClient
            .from('integration_events')
            .insert({
                company_id: companyId,
                integration_id: integration.id,
                event_type: eventType,
                payload,
                cups: cups ?? null,
                processed: false,
            })
            .select('id')
            .single()

        if (eventInsertErr || !eventRecord) {
            console.error('integration-webhook: failed to insert event', eventInsertErr)
            return respond({ received: true, status: 'event_insert_failed' })
        }

        const eventId = eventRecord.id
        let processedOk = true
        let processError: string | null = null

        // -----------------------------------------------------------------------
        // Business logic per event type
        // -----------------------------------------------------------------------
        if (externalContractId) {
            if (eventType === 'contract.activated') {
                const { error: updateErr } = await supabaseClient
                    .from('contracts')
                    .update({ status: 'active' })
                    .eq('company_id', companyId)
                    .eq('contract_number', externalContractId)

                if (updateErr) {
                    processedOk = false
                    processError = updateErr.message
                    console.error('integration-webhook: contract.activated update failed', updateErr)
                }
            } else if (eventType === 'contract.rejected') {
                const { error: updateErr } = await supabaseClient
                    .from('contracts')
                    .update({ status: 'cancelled' })
                    .eq('company_id', companyId)
                    .eq('contract_number', externalContractId)

                if (updateErr) {
                    processedOk = false
                    processError = updateErr.message
                    console.error('integration-webhook: contract.rejected update failed', updateErr)
                }
            } else if (eventType === 'switching.in_progress') {
                const { error: updateErr } = await supabaseClient
                    .from('contracts')
                    .update({ switching_status: 'in_progress' })
                    .eq('company_id', companyId)
                    .eq('contract_number', externalContractId)

                if (updateErr) {
                    processedOk = false
                    processError = updateErr.message
                    console.error('integration-webhook: switching.in_progress update failed', updateErr)
                }
            } else if (eventType === 'switching.completed') {
                const { error: updateErr } = await supabaseClient
                    .from('contracts')
                    .update({ switching_status: 'completed', status: 'active' })
                    .eq('company_id', companyId)
                    .eq('contract_number', externalContractId)

                if (updateErr) {
                    processedOk = false
                    processError = updateErr.message
                    console.error('integration-webhook: switching.completed update failed', updateErr)
                }
            } else if (eventType === 'switching.rejected') {
                const { error: updateErr } = await supabaseClient
                    .from('contracts')
                    .update({ switching_status: 'rejected' })
                    .eq('company_id', companyId)
                    .eq('contract_number', externalContractId)

                if (updateErr) {
                    processedOk = false
                    processError = updateErr.message
                    console.error('integration-webhook: switching.rejected update failed', updateErr)
                }
            }
        }

        // Mark event as processed (or failed)
        await supabaseClient
            .from('integration_events')
            .update({
                processed: processedOk,
                processed_at: processedOk ? new Date().toISOString() : null,
                error: processError,
            })
            .eq('id', eventId)

        return respond({ received: true, event_id: eventId })

    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.error('integration-webhook: unhandled error', err)
        // Still 200 to prevent provider retries
        return respond({ received: true, status: 'internal_error' })
    }
})
