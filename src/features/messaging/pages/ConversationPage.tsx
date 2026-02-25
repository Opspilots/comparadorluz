import { useState, useEffect, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { ChatWindow } from '../components/ChatWindow';
import { getMessages, sendMessage, getUserCompanyId, Message } from '../lib/messaging-service';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ConversationPage() {
    const { customerId } = useParams<{ customerId: string }>();
    const { activeChannel } = useOutletContext<{ activeChannel: 'email' | 'whatsapp' }>();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

    // Get current user's company_id
    const { data: companyId } = useQuery({
        queryKey: ['user-company-id'],
        queryFn: getUserCompanyId,
        staleTime: Infinity
    });

    // Fetch customer and their contacts
    const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
        queryKey: ['customer-with-contacts', customerId],
        queryFn: async () => {
            if (!customerId) return null;

            const { data: customer, error: custErr } = await supabase
                .from('customers')
                .select('id, name')
                .eq('id', customerId)
                .single();
            if (custErr) throw custErr;

            const { data: contacts, error: contErr } = await supabase
                .from('contacts')
                .select('*')
                .eq('customer_id', customerId);
            if (contErr) throw contErr;

            return { customer, contacts: contacts || [] };
        },
        enabled: !!customerId
    });

    // Messages Query - Filtered by active channel AND company
    const { data: messages, isLoading: isLoadingMessages } = useQuery({
        queryKey: ['messages', customerId, activeChannel, companyId],
        queryFn: () => getMessages(customerId!, companyId!, activeChannel),
        enabled: !!customerId && !!companyId,
        refetchInterval: 5000
    });

    // Filter contacts to only show those with the relevant channel info
    const filteredContacts = useMemo(() => (customerData?.contacts || []).filter(c =>
        activeChannel === 'email' ? !!c.email : !!c.phone
    ), [customerData, activeChannel]);

    // Auto-select first valid contact for the active channel
    useEffect(() => {
        if (filteredContacts.length > 0) {
            const currentStillValid = filteredContacts.some(c => c.id === selectedContactId);
            if (!currentStillValid) {
                setSelectedContactId(filteredContacts[0].id);
            }
        } else {
            setSelectedContactId(null);
        }
    }, [filteredContacts, selectedContactId]);

    // Supabase Realtime Subscription for incoming messages
    useEffect(() => {
        if (!customerId || !companyId) return;

        const channelPath = `public:messages:customer_id=eq.${customerId}`;
        const channel = supabase.channel(channelPath)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `customer_id=eq.${customerId}`
                },
                (payload) => {
                    // Check if the new message matches the currently active view
                    const newMessage = payload.new as Message;
                    if (newMessage.channel === activeChannel) {
                        // Invalidate the query to fetch the newest messages
                        queryClient.invalidateQueries({ queryKey: ['messages', customerId, activeChannel] });

                        // Optional: Show a toast if it's an inbound message
                        if (newMessage.direction === 'inbound') {
                            toast({
                                title: `Nuevo mensaje de ${activeChannel === 'email' ? 'Correo' : 'WhatsApp'}`,
                                description: `Recibido de: ${newMessage.recipient_contact}`,
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [customerId, companyId, activeChannel, queryClient, toast]);

    const mutation = useMutation({
        mutationFn: async ({ content, subject, attachments }: { content: string, subject?: string, attachments?: Message['attachments'] }) => {
            if (!selectedContactId) throw new Error("No hay contacto seleccionado");

            const selectedContact = customerData?.contacts.find(c => c.id === selectedContactId);
            const recipient = activeChannel === 'email' ? selectedContact?.email : selectedContact?.phone;

            if (!recipient) {
                throw new Error(`El contacto seleccionado no tiene ${activeChannel === 'email' ? 'email' : 'teléfono'}`);
            }

            if (!companyId) throw new Error('Company ID not found');

            return sendMessage({
                company_id: companyId,
                customer_id: customerId!,
                channel: activeChannel,
                recipient_contact: recipient,
                contact_id: selectedContactId,
                content,
                subject,
                attachments
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', customerId, activeChannel] });
        },
        onError: (err) => {
            const error = err as Error;
            toast({
                title: "Error al enviar",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    if (isLoadingCustomer || isLoadingMessages) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ width: 28, height: 28, color: '#cbd5e1', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!customerData?.customer) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                Cliente no encontrado
            </div>
        );
    }

    const currentContact = filteredContacts.find(c => c.id === selectedContactId);
    const hasCorrectContactInfo = activeChannel === 'email' ? !!currentContact?.email : !!currentContact?.phone;
    const noContactsForChannel = filteredContacts.length === 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', position: 'relative' }}>
            {/* Contact selector bar */}
            {/* Contact selector bar removed as per user request */}

            <ChatWindow
                customerName={customerData.customer.name}
                customerContact={currentContact ? (activeChannel === 'email' ? currentContact.email : currentContact.phone) : 'Seleccione contacto'}
                messages={messages || []}
                onSendMessage={(content, subject, attachments) => mutation.mutate({ content, subject, attachments })}
                isLoading={mutation.isPending}
                channel={activeChannel}
                disableInput={!selectedContactId || !hasCorrectContactInfo || noContactsForChannel}
            />
        </div>
    );
}
