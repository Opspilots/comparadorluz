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
    // Step 1: Get paginated distinct customer_ids using a server-side
    // distinct query ordered by latest message. This avoids fetching all rows.
    let distinctQuery = supabase
        .from('messages')
        .select('customer_id, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (channel) {
        distinctQuery = distinctQuery.eq('channel', channel);
    }

    // Fetch a limited window — enough to extract distinct customers for the page.
    // We over-fetch rows (not customers) to account for multiple messages per customer.
    const fetchLimit = (page + 1) * pageSize * 10;
    distinctQuery = distinctQuery.limit(fetchLimit);

    const { data: recentMessages, error: distinctError } = await distinctQuery;
    if (distinctError) throw distinctError;

    // Deduplicate to get ordered distinct customer_ids
    const seenCustomers = new Set<string>();
    const orderedCustomerIds: string[] = [];
    recentMessages?.forEach((msg: { customer_id: string }) => {
        if (!msg.customer_id || seenCustomers.has(msg.customer_id)) return;
        seenCustomers.add(msg.customer_id);
        orderedCustomerIds.push(msg.customer_id);
    });

    const pagedIds = orderedCustomerIds.slice(page * pageSize, (page + 1) * pageSize);
    if (pagedIds.length === 0) return [];

    // Step 2: Get the last message + customer info for paged customers,
    // plus per-customer counts via a parallel count query.
    let detailQuery = supabase
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
        detailQuery = detailQuery.eq('channel', channel);
    }

    // Run detail query and per-customer count queries in parallel
    const countPromises = pagedIds.map(async (customerId) => {
        let cq = supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('customer_id', customerId);
        if (channel) {
            cq = cq.eq('channel', channel);
        }
        const { count, error } = await cq;
        return { customerId, count: error ? 1 : (count ?? 1) };
    });

    const [detailResult, ...countResults] = await Promise.all([
        detailQuery,
        ...countPromises
    ]);

    const { data, error } = detailResult;
    if (error) throw error;

    const customerCounts = new Map<string, number>();
    countResults.forEach(({ customerId, count }) => {
        customerCounts.set(customerId, count);
    });

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

export async function uploadAttachment(file: File, companyId?: string) {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`El archivo "${file.name}" es demasiado grande (máx 10 MB)`);
    }
    if (!ALLOWED_TYPE_PREFIXES.some(prefix => file.type.startsWith(prefix))) {
        throw new Error(`Tipo de archivo no permitido: ${file.type}`);
    }

    // Resolve companyId for tenant-scoped storage path
    const tenantId = companyId || await getUserCompanyId();

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${tenantId}/${fileName}`;

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


