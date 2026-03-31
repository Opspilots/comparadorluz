import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Mail, Megaphone, Search, Loader2, Plus, ArrowLeft, MessageSquare } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getConversations, getUserCompanyId } from '../lib/messaging-service';
import { useCustomerSearch } from '../lib/useCustomerSearch';
import { NewMessageDialog } from '../components/NewMessageDialog';

function WhatsAppIcon({ style }: { style?: React.CSSProperties }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, ...style }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    );
}

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
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

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
        setMobileSidebarOpen(false);
        navigate(`/admin/messages/${customerId}`);
    };

    const isCampaignsRoute = location.pathname.includes('/campaigns');
    // On mobile, when viewing a conversation, hide sidebar
    const hasActiveConversation = /\/admin\/messages\/[^/]+$/.test(location.pathname) && !isCampaignsRoute;

    return (
        <div className="messaging-root" style={S.root}>
            {/* Sidebar */}
            <div
                className={`messaging-sidebar ${!mobileSidebarOpen && hasActiveConversation ? 'messaging-sidebar-collapsed' : ''}`}
                style={S.sidebar}
            >
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
                            <WhatsAppIcon />
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
                <div className="messaging-conv-list" style={S.convList}>
                    {isLoadingConversations ? (
                        <div style={S.loading}>
                            <Loader2 style={{ width: 20, height: 20, color: '#cbd5e1', animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : conversations?.length === 0 ? (
                        <div style={S.emptyState}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                                {activeChannel === 'whatsapp'
                                    ? <WhatsAppIcon style={{ width: 20, height: 20, color: '#94a3b8' }} />
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
                                    key={`${conv.customer.id}-${activeChannel}`}
                                    style={S.convItem(isActive)}
                                    onClick={() => {
                                        setMobileSidebarOpen(false);
                                        navigate(`/admin/messages/${conv.customer.id}`);
                                    }}
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
            <div className="messaging-main" style={S.main}>
                {/* Mobile back button — shown when sidebar is hidden */}
                {hasActiveConversation && !mobileSidebarOpen && (
                    <button
                        className="messaging-mobile-toggle"
                        onClick={() => setMobileSidebarOpen(true)}
                        style={{
                            display: 'none', /* shown via CSS on mobile */
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.625rem 1rem',
                            background: '#fff',
                            border: 'none',
                            borderBottom: '1px solid #e2e8f0',
                            color: '#2563eb',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: '100%',
                        }}
                    >
                        <ArrowLeft size={16} />
                        Conversaciones
                    </button>
                )}
                {!hasActiveConversation && !isCampaignsRoute && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                        <div style={{ textAlign: 'center' }}>
                            <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ fontWeight: 500 }}>Selecciona una conversación</p>
                        </div>
                    </div>
                )}
                <Outlet context={{ activeChannel }} />
            </div>

            <NewMessageDialog
                open={isNewMessageOpen}
                onOpenChange={setIsNewMessageOpen}
            />
        </div>
    );
}
