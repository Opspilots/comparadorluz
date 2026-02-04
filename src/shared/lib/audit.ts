import { supabase } from '@/shared/lib/supabase'

/**
 * Audit Log Helper
 * 
 * Logic to record critical actions in the database for compliance.
 */
export async function recordAuditLog(params: {
    action: string
    entity_type: string
    entity_id?: string
    metadata?: Record<string, unknown>
}) {
    const { action, entity_type, entity_id, metadata } = params

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('audit_log').insert({
        action,
        entity_type,
        entity_id,
        metadata,
        user_id: user?.id,
        // Note: company_id is handled via RLS/Triggers usually, 
        // but we'll include it explicitly if needed.
        // In our schema, it's NOT NULL, so we should get it from the user's profile.
    })

    if (error) {
        console.error('Failed to record audit log:', error)
    }
}
