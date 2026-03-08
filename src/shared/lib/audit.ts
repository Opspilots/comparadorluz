import { supabase } from '@/shared/lib/supabase'

/**
 * Audit Log Helper
 *
 * Uses the SECURITY DEFINER RPC function `create_audit_log` which resolves
 * company_id internally via auth.uid(), bypassing the RLS restriction on
 * direct inserts into the audit_log table.
 */
export async function recordAuditLog(params: {
    action: string
    entity_type: string
    entity_id?: string
    metadata?: Record<string, unknown>
}) {
    const { action, entity_type, entity_id, metadata } = params

    const { error } = await supabase.rpc('create_audit_log', {
        p_action: action,
        p_entity_type: entity_type,
        p_entity_id: entity_id ?? null,
        p_metadata: metadata ?? null,
    })

    if (error) {
        console.error('Failed to record audit log:', error)
    }
}
