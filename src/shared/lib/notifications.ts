import { supabase } from './supabase'

export interface CreateNotificationParams {
    userId: string
    type: 'contract_renewal' | 'lead_followup' | 'task_reminder' | 'status_change' | 'general'
    title: string
    message: string
    link?: string
    metadata?: Record<string, unknown>
}

export async function createNotification(params: CreateNotificationParams) {
    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            link: params.link,
            metadata: params.metadata
        })

    if (error) {
        console.error('Error creating notification:', error)
        throw error
    }
}

// Helper para crear notificación automáticamente para el usuario actual
export async function createNotificationForCurrentUser(
    type: CreateNotificationParams['type'],
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>
) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('No authenticated user')
    }

    return createNotification({
        userId: user.id,
        type,
        title,
        message,
        link,
        metadata
    })
}
