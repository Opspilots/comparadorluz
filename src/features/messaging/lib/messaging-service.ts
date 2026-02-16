import { supabase } from '@/shared/lib/supabase';

export interface Message {
    id: string;
    customer_id: string;
    contact_id?: string;
    channel: 'email' | 'whatsapp';
    recipient_contact: string;
    content: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'opened';
    created_at: string;
    sent_at?: string;
    campaign_id?: string;
    subject?: string;
    direction: 'inbound' | 'outbound';
    attachments?: {
        name: string;
        url: string;
        type: string;
        size: number;
    }[];
}

export interface Conversation {
    customer: {
        id: string;
        name: string;
    };
    lastMessage: {
        customer_id: string;
        created_at: string;
        content: string;
        recipient_contact: string;
    };
    count: number;
}

export async function getConversations(channel?: 'email' | 'whatsapp'): Promise<Conversation[]> {
    let query = supabase
        .from('messages')
        .select(`
            customer_id,
            created_at,
            content,
            channel,
            recipient_contact,
            customers (
                id,
                name
            )
        `)
        .order('created_at', { ascending: false });

    if (channel) {
        query = query.eq('channel', channel);
    }

    const { data, error } = await query;

    if (error) throw error;

    const conversationsMap = new Map<string, Conversation>();

    data?.forEach((msg: any) => {
        if (!msg.customer_id) return;
        if (!conversationsMap.has(msg.customer_id)) {
            conversationsMap.set(msg.customer_id, {
                customer: msg.customers as any,
                lastMessage: msg,
                count: 1
            });
        } else {
            const conv = conversationsMap.get(msg.customer_id);
            if (conv) conv.count++;
        }
    });

    return Array.from(conversationsMap.values());
}

export async function getMessages(customerId: string, channel?: 'email' | 'whatsapp'): Promise<Message[]> {
    let query = supabase
        .from('messages')
        .select('*')
        .eq('customer_id', customerId);

    if (channel) {
        query = query.eq('channel', channel);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((m: any) => ({
        ...m,
        direction: m.direction || 'outbound'
    }));
}

export async function uploadAttachment(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

    return {
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size
    };
}

export async function sendMessage(payload: {
    company_id: string;
    customer_id: string;
    contact_id?: string;
    channel: 'email' | 'whatsapp';
    recipient_contact: string;
    content: string;
    subject?: string;
    attachments?: Message['attachments'];
}): Promise<Message> {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            company_id: payload.company_id,
            customer_id: payload.customer_id,
            contact_id: payload.contact_id,
            channel: payload.channel,
            recipient_contact: payload.recipient_contact,
            content: payload.content,
            subject: payload.subject,
            attachments: payload.attachments,
            status: 'sent',
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;

    // Trigger Edge Function for real sending
    // We don't await this to avoid blocking the UI, but we log errors
    supabase.functions.invoke('send-message', {
        body: { messageId: data.id }
    }).then(({ error: invokeError }) => {
        if (invokeError) console.error('Error triggering real send:', invokeError);
    });

    return {
        ...data,
        direction: 'outbound'
    };
}


