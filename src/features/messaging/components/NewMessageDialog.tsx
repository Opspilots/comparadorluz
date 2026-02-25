import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/shared/components/ui/input';
import { useCustomerSearch } from '../lib/useCustomerSearch';
import { Loader2, User, Search, X } from 'lucide-react';

interface NewMessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const S = {
    overlay: {
        position: 'fixed' as const,
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
    },
    dialog: {
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'fadeIn 0.25s ease-out',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e2e8f0',
    },
    title: {
        fontSize: '1.0625rem',
        fontWeight: 700,
        color: '#0f172a',
        margin: 0,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: '8px',
        border: 'none',
        background: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#64748b',
        transition: 'all 0.15s',
    },
    body: {
        padding: '1.25rem 1.5rem',
    },
    searchWrapper: {
        position: 'relative' as const,
        marginBottom: '1rem',
    },
    searchIconStyle: {
        position: 'absolute' as const,
        left: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 14,
        height: 14,
        color: '#94a3b8',
        pointerEvents: 'none' as const,
    },
    resultsList: {
        maxHeight: '300px',
        overflowY: 'auto' as const,
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
    },
    resultItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        cursor: 'pointer',
        transition: 'background 0.15s',
        borderBottom: '1px solid #f1f5f9',
        background: 'transparent',
        border: 'none',
        width: '100%',
        textAlign: 'left' as const,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#eff6ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    name: {
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: '#0f172a',
        margin: 0,
    },
    contact: {
        fontSize: '0.75rem',
        color: '#64748b',
        margin: '0.125rem 0 0 0',
    },
    empty: {
        padding: '2rem 1rem',
        textAlign: 'center' as const,
        color: '#94a3b8',
        fontSize: '0.8125rem',
    },
};

export function NewMessageDialog({ open, onOpenChange }: NewMessageDialogProps) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: customers, isLoading } = useCustomerSearch(searchTerm);

    const handleSelectCustomer = (customerId: string) => {
        setSearchTerm('');
        onOpenChange(false);
        navigate(`/admin/messages/${customerId}`);
    };

    if (!open) return null;

    return (
        <div
            style={S.overlay}
            onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
        >
            <div style={S.dialog}>
                {/* Header */}
                <div style={S.header}>
                    <h3 style={S.title}>Nuevo Mensaje</h3>
                    <button
                        style={S.closeBtn}
                        onClick={() => onOpenChange(false)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                    >
                        <X style={{ width: 16, height: 16 }} />
                    </button>
                </div>

                {/* Body */}
                <div style={S.body}>
                    {/* Search */}
                    <div style={S.searchWrapper}>
                        <Search style={S.searchIconStyle} />
                        <Input
                            placeholder="Buscar cliente por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            style={{
                                paddingLeft: '2.25rem',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                fontSize: '0.8125rem',
                                height: '40px',
                            }}
                        />
                    </div>

                    {/* Results */}
                    <div style={S.resultsList}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                                <Loader2 style={{ width: 20, height: 20, color: '#cbd5e1', animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : searchTerm.length < 2 ? (
                            <div style={S.empty}>
                                Escribe al menos 2 caracteres para buscar.
                            </div>
                        ) : customers?.length === 0 ? (
                            <div style={S.empty}>
                                No se encontraron clientes.
                            </div>
                        ) : (
                            customers?.map((customer) => (
                                <div
                                    key={customer.id}
                                    style={S.resultItem}
                                    onClick={() => handleSelectCustomer(customer.id)}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={S.avatar}>
                                        <User style={{ width: 16, height: 16, color: '#3b82f6' }} />
                                    </div>
                                    <div>
                                        <p style={S.name}>{customer.name}</p>
                                        <p style={S.contact}>{customer.cif || 'Sin CIF'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
