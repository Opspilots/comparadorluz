
import { useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { getUserCompanyId } from '../lib/messaging-service';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Plus, Search, MoreHorizontal, Mail, Phone, Megaphone, Trash2, Edit, Eye, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Campaign } from '@/shared/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { removeEmojis } from '@/shared/lib/utils';

const STYLES = {
    page: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1.5rem',
        padding: '1.5rem',
        flex: 1,
        overflowY: 'auto' as const,
        animation: 'fadeIn 0.4s ease-out',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        margin: 0,
        background: 'linear-gradient(135deg, #0f172a, #334155)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
        margin: '0.25rem 0 0 0',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
    },
    statCard: (gradient: string) => ({
        background: gradient,
        borderRadius: '16px',
        padding: '1.25rem',
        color: '#fff',
        position: 'relative' as const,
        overflow: 'hidden',
        boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.15)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    }),
    statCardOverlay: {
        position: 'absolute' as const,
        top: 0,
        right: 0,
        bottom: 0,
        width: '120px',
        background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.08) 100%)',
        borderRadius: '0 16px 16px 0',
    },
    statLabel: {
        fontSize: '0.75rem',
        fontWeight: 500,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        opacity: 0.85,
        margin: 0,
    },
    statValue: {
        fontSize: '2rem',
        fontWeight: 700,
        margin: '0.25rem 0 0 0',
        lineHeight: 1.2,
    },
    statIcon: {
        position: 'absolute' as const,
        top: '1rem',
        right: '1rem',
        opacity: 0.25,
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    searchWrapper: {
        position: 'relative' as const,
        width: '100%',
        maxWidth: '380px',
    },
    searchIcon: {
        position: 'absolute' as const,
        left: '0.75rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#94a3b8',
        pointerEvents: 'none' as const,
    },
    tableContainer: {
        background: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontSize: '0.875rem',
    },
    th: {
        textAlign: 'left' as const,
        padding: '0.875rem 1rem',
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: '#64748b',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
    },
    td: {
        padding: '0.875rem 1rem',
        borderBottom: '1px solid var(--border-light, #f1f5f9)',
        verticalAlign: 'middle' as const,
    },
    channelBadge: (channel: string) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: channel === 'whatsapp' ? '#dcfce7' : '#dbeafe',
        color: channel === 'whatsapp' ? '#15803d' : '#1d4ed8',
    }),
    statusBadge: (status: string) => {
        const base = {
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            border: '1px solid transparent',
            display: 'inline-flex',
            alignItems: 'center'
        };

        switch (status) {
            case 'completed': return { ...base, background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' };
            case 'sending': return { ...base, background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' };
            case 'scheduled': return { ...base, background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' };
            case 'cancelled': return { ...base, background: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' };
            default: return { ...base, background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }; // draft
        }
    },
    statusLabels: {
        draft: 'Borrador',
        scheduled: 'Programada',
        sending: 'Enviando',
        completed: 'Completada',
        cancelled: 'Cancelada',
    } as Record<string, string>,
    emptyRow: {
        textAlign: 'center' as const,
        padding: '3rem 1rem',
        color: 'var(--text-muted)',
    },
    // Removed custom newButton style in favor of global class
};

export function CampaignsPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: campaigns = [], isLoading: loading } = useQuery<Campaign[]>({
        queryKey: ['campaigns'],
        queryFn: async () => {
            const companyId = await getUserCompanyId();
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data ?? []) as Campaign[];
        },
    });

    const handleDelete = async () => {
        if (!deleteTarget) return;

        const { error } = await supabase.from('campaigns').delete().eq('id', deleteTarget);
        if (error) {
            toast({ title: 'Error', description: 'Error al eliminar la campaña', variant: 'destructive' });
        } else {
            toast({ title: 'Campaña eliminada', description: 'La campaña se ha eliminado correctamente.' });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        }
        setDeleteTarget(null);
    };

    const filteredCampaigns = campaigns.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div style={STYLES.page}>
                {/* Actions Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Search */}
                    <div className="tour-campaigns-search" style={STYLES.searchWrapper}>
                        <Search style={{ ...STYLES.searchIcon, width: 16, height: 16 }} />
                        <Input
                            placeholder="Buscar campañas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' }}
                        />
                    </div>

                    <button
                        className="btn btn-primary tour-campaigns-new-btn"
                        onClick={() => navigate('/admin/messages/campaigns/new')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus style={{ width: 18, height: 18 }} />
                        Nueva Campaña
                    </button>
                </div>

                {/* Table */}
                <div className="tour-campaigns-list" style={STYLES.tableContainer}>
                    <table style={STYLES.table}>
                        <thead>
                            <tr>
                                <th style={{ ...STYLES.th, color: 'var(--text-muted)', background: 'var(--surface-alt)' }}>Nombre</th>
                                <th style={{ ...STYLES.th, color: 'var(--text-muted)', background: 'var(--surface-alt)' }}>Canal</th>
                                <th style={{ ...STYLES.th, color: 'var(--text-muted)', background: 'var(--surface-alt)' }}>Estado</th>
                                <th style={{ ...STYLES.th, color: 'var(--text-muted)', background: 'var(--surface-alt)' }}>Fecha</th>
                                <th style={{ ...STYLES.th, color: 'var(--text-muted)', background: 'var(--surface-alt)', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={STYLES.emptyRow}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
                                            Cargando...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={STYLES.emptyRow}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Megaphone style={{ width: 24, height: 24, color: '#94a3b8' }} />
                                            </div>
                                            <p style={{ margin: 0, fontWeight: 500 }}>No hay campañas creadas</p>
                                            <p style={{ margin: 0, fontSize: '0.8rem' }}>Crea tu primera campaña de email o WhatsApp</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map((campaign) => (
                                    <tr key={campaign.id} style={{ transition: 'background 0.15s', borderBottom: '1px solid var(--border-light)' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={{ ...STYLES.td, fontWeight: 600, color: '#0f172a' }}>
                                            <div>
                                                {removeEmojis(campaign.name)}
                                                {campaign.subject && (
                                                    <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                                                        {removeEmojis(campaign.subject)}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td style={STYLES.td}>
                                            <span style={STYLES.channelBadge(campaign.channel || 'email')}>
                                                {campaign.channel === 'whatsapp' ? (
                                                    <Phone style={{ width: 12, height: 12 }} />
                                                ) : (
                                                    <Mail style={{ width: 12, height: 12 }} />
                                                )}
                                                {campaign.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                                            </span>
                                        </td>
                                        <td style={STYLES.td}>
                                            <span style={STYLES.statusBadge(campaign.status)}>
                                                {STYLES.statusLabels[campaign.status] || campaign.status}
                                            </span>
                                        </td>
                                        <td style={{ ...STYLES.td, color: '#64748b', fontSize: '0.8rem' }}>
                                            {campaign.scheduled_at
                                                ? format(new Date(campaign.scheduled_at), 'dd MMM yyyy, HH:mm', { locale: es })
                                                : format(new Date(campaign.created_at), 'dd MMM yyyy', { locale: es })
                                            }
                                        </td>
                                        <td style={{ ...STYLES.td, textAlign: 'right' }}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" style={{ height: 32, width: 32, padding: 0, borderRadius: '8px' }}>
                                                        <MoreHorizontal style={{ width: 16, height: 16 }} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/messages/campaigns/${campaign.id}`)}>
                                                        <Eye style={{ width: 14, height: 14, marginRight: 8 }} />
                                                        Ver detalles
                                                    </DropdownMenuItem>
                                                    {campaign.status === 'draft' && (
                                                        <DropdownMenuItem onClick={() => navigate(`/admin/messages/campaigns/${campaign.id}/edit`)}>
                                                            <Edit style={{ width: 14, height: 14, marginRight: 8 }} />
                                                            Editar
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteTarget(campaign.id)}
                                                        style={{ color: '#dc2626' }}
                                                    >
                                                        <Trash2 style={{ width: 14, height: 14, marginRight: 8 }} />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Eliminar campaña"
                message="¿Eliminar esta campaña? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </>
    );
}
