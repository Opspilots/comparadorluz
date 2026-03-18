import { supabase } from '@/shared/lib/supabase';

/**
 * Returns the company_id for the currently authenticated user.
 * Centralises the repeated getUser() → users.select('company_id') pattern.
 */
export async function getUserCompanyId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

    if (error || !data?.company_id) {
        throw new Error('No se encontró la empresa del usuario');
    }

    return data.company_id;
}

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

interface ConversationMessage {
    customer_id: string;
    created_at: string;
    content: string;
    channel: 'email' | 'whatsapp';
    recipient_contact: string;
    customers: {
        id: string;
        name: string;
    } | { id: string; name: string }[] | null;
}

export async function getConversations(companyId: string, channel?: 'email' | 'whatsapp', page = 0, pageSize = 50): Promise<Conversation[]> {
    // Step 1: Get distinct customer_ids with message counts (lightweight query)
    let countQuery = supabase
        .from('messages')
        .select('customer_id', { count: 'exact', head: false })
        .eq('company_id', companyId);

    if (channel) {
        countQuery = countQuery.eq('channel', channel);
    }

    const { data: allMessages, error: countError } = await countQuery;
    if (countError) throw countError;

    // Group by customer_id in JS to get counts and determine page
    const customerCounts = new Map<string, number>();
    allMessages?.forEach((msg: { customer_id: string }) => {
        if (!msg.customer_id) return;
        customerCounts.set(msg.customer_id, (customerCounts.get(msg.customer_id) || 0) + 1);
    });

    const customerIds = Array.from(customerCounts.keys());
    const pagedIds = customerIds.slice(page * pageSize, (page + 1) * pageSize);

    if (pagedIds.length === 0) return [];

    // Step 2: Get the last message per customer for this page
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
        .eq('company_id', companyId)
        .in('customer_id', pagedIds)
        .order('created_at', { ascending: false });

    if (channel) {
        query = query.eq('channel', channel);
    }

    const { data, error } = await query;

    if (error) throw error;

    const conversationsMap = new Map<string, Conversation>();

    data?.forEach((msg: ConversationMessage) => {
        if (!msg.customer_id) return;
        const customer = Array.isArray(msg.customers) ? msg.customers[0] : msg.customers;
        if (!conversationsMap.has(msg.customer_id)) {
            conversationsMap.set(msg.customer_id, {
                customer: customer || { id: msg.customer_id, name: 'Desconocido' },
                lastMessage: {
                    customer_id: msg.customer_id,
                    created_at: msg.created_at,
                    content: msg.content,
                    recipient_contact: msg.recipient_contact || ''
                },
                count: customerCounts.get(msg.customer_id) || 1
            });
        }
    });

    // Sort by last message date descending
    return Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
}

export async function getMessages(customerId: string, companyId: string, channel?: 'email' | 'whatsapp'): Promise<Message[]> {
    let query = supabase
        .from('messages')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId);

    if (channel) {
        query = query.eq('channel', channel);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((m) => ({
        ...m,
        direction: (m as Message).direction || 'outbound'
    })) as Message[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPE_PREFIXES = ['image/', 'application/pdf', 'text/', 'application/vnd.', 'application/msword'];

export async function uploadAttachment(file: File) {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`El archivo "${file.name}" es demasiado grande (máx 10 MB)`);
    }
    if (!ALLOWED_TYPE_PREFIXES.some(prefix => file.type.startsWith(prefix))) {
        throw new Error(`Tipo de archivo no permitido: ${file.type}`);
    }

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
            status: 'pending',
            direction: 'outbound',
            created_at: new Date().toISOString(),
            sent_at: null
        })
        .select()
        .single();

    if (error) throw error;

    // Trigger Edge Function for real sending
    const { error: invokeError } = await supabase.functions.invoke('send-message', {
        body: { messageId: data.id }
    });

    if (invokeError) {
        // The edge function already marks the message as 'failed' in its catch block,
        // so we only extract the error message here for the UI toast.
        let actualError = 'Error desconocido en Edge Function';

        if (invokeError.context) {
            try {
                const edgeBody = await invokeError.context.json();
                if (edgeBody.error) {
                    actualError = edgeBody.error;
                }
            } catch (e) {
                console.error("Failed to parse edge response:", e);
            }
        }

        console.error('Error en envío real:', invokeError, actualError);
        throw new Error(`Fallo al enviar: ${actualError}`);
    }

    return {
        ...data,
        direction: 'outbound'
    } as Message;
}


