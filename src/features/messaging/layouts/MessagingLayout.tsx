import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Mail, Phone, Megaphone, Search, Loader2, Plus } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getConversations, getUserCompanyId } from '../lib/messaging-service';
import { useCustomerSearch } from '../lib/useCustomerSearch';
import { NewMessageDialog } from '../components/NewMessageDialog';

const S = {
    root: {
        display: 'flex',
        height: 'calc(100vh - 53px)',
        background: '#f8fafc',
        margin: '-2rem',
        width: 'calc(100% + 4rem)',
        overflow: 'hidden',
    },
    sidebar: {
        width: '320px',
        minWidth: '320px',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column' as const,
    },
    sidebarHeader: {
        padding: '1rem 1rem 0.75rem 1rem',
        borderBottom: '1px solid #e2e8f0',
    },
    topRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
    },
    heading: {
        fontSize: '1.125rem',
        fontWeight: 700,
        margin: 0,
        color: '#0f172a',
    },
    topActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: '8px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s',
        color: '#64748b',
    },
    channelTabs: {
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '0.75rem',
        background: '#f1f5f9',
        borderRadius: '10px',
        padding: '3px',
    },
    channelTab: (active: boolean, color: string) => ({
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.375rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 600,
        fontSize: '0.8125rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: active ? '#ffffff' : 'transparent',
        color: active ? color : '#94a3b8',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    }),
    searchWrapper: {
        position: 'relative' as const,
    },
    searchIcon: {
        position: 'absolute' as const,
        left: '0.625rem',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 14,
        height: 14,
        color: '#94a3b8',
        pointerEvents: 'none' as const,
    },
    searchDropdown: {
        position: 'absolute' as const,
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
        zIndex: 10,
        maxHeight: '240px',
        overflowY: 'auto' as const,
    },
    searchItem: {
        padding: '0.5rem 0.75rem',
        fontSize: '0.8125rem',
        cursor: 'pointer',
        transition: 'background 0.1s',
    },
    convList: {
        flex: 1,
        overflowY: 'auto' as const,
    },
    convItem: (active: boolean) => ({
        padding: '0.875rem 1rem',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: active ? '#eff6ff' : 'transparent',
    }),
    convName: {
        fontWeight: 600,
        fontSize: '0.8125rem',
        color: '#0f172a',
        margin: 0,
    },
    convDate: {
        fontSize: '0.6875rem',
        color: '#94a3b8',
    },
    convPreview: {
        fontSize: '0.75rem',
        color: '#64748b',
        margin: '0.25rem 0 0 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    convChannelDot: (channel: string) => ({
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: channel === 'whatsapp' ? '#22c55e' : '#3b82f6',
        marginRight: '0.375rem',
    }),
    emptyState: {
        padding: '2rem 1rem',
        textAlign: 'center' as const,
        color: '#94a3b8',
        fontSize: '0.8125rem',
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
    },
    main: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
    },
};

export default function MessagingLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
    const [activeChannel, setActiveChannel] = useState<'email' | 'whatsapp'>('email');

    // Fetch conversations filtered by channel
    const { data: conversations, isLoading: isLoadingConversations } = useQuery({
        queryKey: ['conversations', activeChannel],
        queryFn: async () => {
            const companyId = await getUserCompanyId();
            return getConversations(companyId, activeChannel);
        },
        refetchInterval: 5000
    });

    // Search customers for new chat
    const { data: searchResults, isLoading: isLoadingSearch } = useCustomerSearch(searchQuery, 5);

    const handleSelectCustomer = (customerId: string) => {
        setSearchQuery('');
        navigate(`/admin/messages/${customerId}`);
    };

    const isCampaignsRoute = location.pathname.includes('/campaigns');

    return (
        <div style={S.root}>
            {/* Sidebar */}
            <div style={S.sidebar}>
                <div style={S.sidebarHeader}>
                    {/* Top Row */}
                    <div style={S.topRow}>
                        <h2 style={S.heading}>Mensajería</h2>
                        <div style={S.topActions}>
                            <button
                                style={{
                                    ...S.iconBtn,
                                    ...(isCampaignsRoute ? { background: '#eff6ff', borderColor: '#93c5fd', color: '#2563eb' } : {})
                                }}
                                title="Campañas"
                                onClick={() => navigate('/admin/messages/campaigns')}
                                onMouseEnter={e => { if (!isCampaignsRoute) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={e => { if (!isCampaignsRoute) e.currentTarget.style.background = '#fff'; }}
                            >
                                <Megaphone style={{ width: 16, height: 16 }} />
                            </button>
                            <button
                                style={S.iconBtn}
                                title="Nuevo mensaje"
                                onClick={() => setIsNewMessageOpen(true)}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                                <Plus style={{ width: 16, height: 16 }} />
                            </button>
                        </div>
                    </div>

                    {/* Channel Tabs */}
                    <div style={S.channelTabs}>
                        <button
                            style={S.channelTab(activeChannel === 'email', '#2563eb')}
                            onClick={() => {
                                setActiveChannel('email');
                                if (isCampaignsRoute) navigate('/admin/messages');
                            }}
                        >
                            <Mail style={{ width: 14, height: 14 }} />
                            Email
                        </button>
                        <button
                            style={S.channelTab(activeChannel === 'whatsapp', '#16a34a')}
                            onClick={() => {
                                setActiveChannel('whatsapp');
                                if (isCampaignsRoute) navigate('/admin/messages');
                            }}
                        >
                            <Phone style={{ width: 14, height: 14 }} />
                            WhatsApp
                        </button>
                    </div>

                    {/* Search */}
                    <div style={S.searchWrapper}>
                        <Search style={S.searchIcon} />
                        <Input
                            placeholder="Buscar cliente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                paddingLeft: '2rem',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                fontSize: '0.8125rem',
                                height: '36px',
                            }}
                        />

                        {/* Search Results Dropdown */}
                        {searchQuery.length >= 2 && (
                            <div style={S.searchDropdown}>
                                {isLoadingSearch ? (
                                    <div style={{ ...S.searchItem, color: '#94a3b8', textAlign: 'center' }}>Buscando...</div>
                                ) : searchResults?.length === 0 ? (
                                    <div style={{ ...S.searchItem, color: '#94a3b8', textAlign: 'center' }}>No encontrado</div>
                                ) : (
                                    searchResults?.map(customer => (
                                        <div
                                            key={customer.id}
                                            style={S.searchItem}
                                            onClick={() => handleSelectCustomer(customer.id)}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {customer.name}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Conversation List */}
                <div style={S.convList}>
                    {isLoadingConversations ? (
                        <div style={S.loading}>
                            <Loader2 style={{ width: 20, height: 20, color: '#cbd5e1', animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : conversations?.length === 0 ? (
                        <div style={S.emptyState}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                                {activeChannel === 'whatsapp'
                                    ? <Phone style={{ width: 20, height: 20, color: '#94a3b8' }} />
                                    : <Mail style={{ width: 20, height: 20, color: '#94a3b8' }} />
                                }
                            </div>
                            <p style={{ margin: 0, fontWeight: 500 }}>
                                No hay conversaciones de {activeChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}.
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>
                                Usa el buscador para iniciar una conversación.
                            </p>
                        </div>
                    ) : (
                        conversations?.map((conv) => {
                            const isActive = location.pathname.includes(conv.customer.id);
                            return (
                                <div
                                    key={conv.customer.id}
                                    style={S.convItem(isActive)}
                                    onClick={() => navigate(`/admin/messages/${conv.customer.id}`)}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <p style={S.convName}>
                                            <span style={S.convChannelDot(activeChannel)} />
                                            {conv.customer.name || 'Sin Nombre'}
                                        </p>
                                        <span style={S.convDate}>
                                            {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p style={S.convPreview}>{conv.lastMessage.content.trim().startsWith('<') ? conv.lastMessage.content.replace(/<[^>]*>/g, '').slice(0, 120) : conv.lastMessage.content}</p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div style={S.main}>
                <Outlet context={{ activeChannel }} />
            </div>

            <NewMessageDialog
                open={isNewMessageOpen}
                onOpenChange={setIsNewMessageOpen}
            />
        </div>
    );
}
