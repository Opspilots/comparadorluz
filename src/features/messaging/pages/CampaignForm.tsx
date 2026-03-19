
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { getUserCompanyId } from '../lib/messaging-service';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { ArrowLeft, Save, Send, Users, FileText, Calendar as CalendarIcon, Loader2, Mail, Phone, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { removeEmojis } from '@/shared/lib/utils';
import type { Campaign } from '@/shared/types';

const STYLES = {
    pageWrapper: {
        flex: 1,
        overflowY: 'auto' as const,
        padding: '1.5rem',
    },
    page: {
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1.5rem',
        paddingBottom: '3rem',
        animation: 'fadeIn 0.4s ease-out',
    },
    headerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: '10px',
        border: '1px solid var(--color-border)',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 700,
        margin: 0,
        letterSpacing: '-0.025em',
    },
    subtitle: {
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
        margin: '0.125rem 0 0 0',
    },
    statusBadge: {
        fontSize: '0.75rem',
        background: '#f1f5f9',
        padding: '0.25rem 0.625rem',
        borderRadius: '6px',
        color: '#64748b',
        fontWeight: 500,
        textTransform: 'capitalize' as const,
    },
    stepsBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 0',
        borderBottom: '1px solid #e2e8f0',
    },
    stepBtn: (active: boolean) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 600,
        fontSize: '0.8125rem',
        cursor: 'pointer',
        transition: 'all 0.15s',
        background: active ? 'var(--color-primary)' : 'transparent', // Use primary color
        color: active ? '#fff' : 'var(--text-muted)',
        // Removed heavy shadow
    }),
    stepArrow: {
        color: '#cbd5e1',
        fontSize: '0.75rem',
        fontWeight: 400,
    },
    formCard: {
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.75rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.375rem',
        marginBottom: '1.25rem',
    },
    label: {
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: '#334155',
    },
    channelGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    channelCard: (selected: boolean, color: string) => ({
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1.5rem',
        borderRadius: '14px',
        border: `2px solid ${selected ? color : '#e2e8f0'}`,
        background: selected ? `${color}08` : '#fafafa',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative' as const,
        overflow: 'hidden',
    }),
    channelIconWrapper: (selected: boolean, bg: string) => ({
        width: 56,
        height: 56,
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: selected ? bg : '#f1f5f9',
        transition: 'all 0.2s',
    }),
    channelName: (selected: boolean) => ({
        fontWeight: 600,
        fontSize: '0.9375rem',
        color: selected ? '#0f172a' : '#64748b',
        margin: 0,
    }),
    channelDesc: {
        fontSize: '0.75rem',
        color: '#94a3b8',
        margin: 0,
        textAlign: 'center' as const,
    },
    channelCheck: {
        position: 'absolute' as const,
        top: '0.75rem',
        right: '0.75rem',
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    audienceBox: {
        background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid #bfdbfe',
        marginBottom: '1.5rem',
    },
    audienceTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: 600,
        color: '#1e40af',
        fontSize: '0.875rem',
        margin: 0,
    },
    audienceSubtitle: {
        fontSize: '0.8rem',
        color: '#3b82f6',
        margin: '0.375rem 0 0 0',
    },
    filtersGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
    },
    reviewGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem',
    },
    reviewCard: {
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
    },
    reviewLabel: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: '#94a3b8',
        margin: '0 0 0.75rem 0',
    },
    reviewItem: {
        marginBottom: '0.5rem',
    },
    reviewItemLabel: {
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#475569',
        margin: 0,
    },
    reviewItemValue: {
        fontSize: '0.8125rem',
        color: '#0f172a',
        margin: '0.125rem 0 0 0',
    },
    previewSection: {
        borderLeft: '4px solid #f59e0b',
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        borderLeftColor: '#f59e0b',
    },
    // WhatsApp Phone Preview
    phonePreview: {
        maxWidth: '320px',
        margin: '0 auto',
        background: '#e5ddd5',
        backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAI0lEQVQoU2NkYPj/n4EIwMjIyEhUOqpg1AXDzAWMRMcDAHEFBAWYcvWlAAAAAElFTkSuQmCC")',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
        border: '8px solid #1f2937',
    },
    phoneHeader: {
        background: '#075e54',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
    },
    phoneAvatar: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    phoneMessages: {
        padding: '1rem',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'flex-end',
    },
    phoneBubble: {
        background: '#dcf8c6',
        padding: '0.625rem 0.75rem',
        borderRadius: '8px 8px 0 8px',
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        maxWidth: '85%',
        alignSelf: 'flex-end' as const,
        boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
        whiteSpace: 'pre-wrap' as const,
    },
    phoneBubbleTime: {
        fontSize: '0.625rem',
        color: '#85998e',
        textAlign: 'right' as const,
        marginTop: '0.25rem',
    },
    // Email Preview
    emailPreview: {
        maxWidth: '480px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.1)',
    },
    emailHeader: {
        background: '#f8fafc',
        padding: '1rem',
        borderBottom: '1px solid #e2e8f0',
    },
    emailMeta: {
        fontSize: '0.75rem',
        color: '#64748b',
        margin: '0 0 0.25rem 0',
    },
    emailSubject: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#0f172a',
        margin: 0,
    },
    emailBody: {
        padding: '1.25rem',
        fontSize: '0.875rem',
        lineHeight: 1.7,
        color: '#334155',
        whiteSpace: 'pre-wrap' as const,
        minHeight: '120px',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '1rem',
    },
    footerRight: {
        display: 'flex',
        gap: '0.5rem',
    },
    // Removed custom button styles (saveDraftBtn, scheduleBtn, cancelBtn, navBtn, nextBtn) in favor of 'btn' classes
};

export function CampaignForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Form State
    const [name, setName] = useState('');
    const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [scheduledAt, setScheduledAt] = useState<string>('');

    // Audience State
    const [customerType, setCustomerType] = useState<string>('all');
    const [customerStatus, setCustomerStatus] = useState<string>('all');
    const [recipientCount, setRecipientCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchCampaign = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                toast({ title: 'Error', description: 'Error al cargar la campaña', variant: 'destructive' });
                navigate('/admin/messages/campaigns');
                return;
            }

            if (data) {
                setName(data.name);
                setChannel(data.channel || 'email');
                setSubject(data.subject || '');
                setBody(data.body || '');
                if (data.filters) {
                    setCustomerType(data.filters.customer_type || 'all');
                    setCustomerStatus(data.filters.status || 'all');
                }
                if (data.scheduled_at) {
                    // Format for datetime-local input: YYYY-MM-DDThh:mm
                    const date = new Date(data.scheduled_at);
                    const isoString = date.toISOString().slice(0, 16);
                    setScheduledAt(isoString);
                }
            }
            setLoading(false);
        };

        if (isEditing) {
            fetchCampaign();
        }
    }, [id, isEditing, navigate, toast]);

    useEffect(() => {
        const estimateRecipients = async () => {
            const companyId = await getUserCompanyId();
            let query = supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId);

            if (customerType !== 'all') {
                query = query.eq('customer_type', customerType);
            }
            if (customerStatus !== 'all') {
                query = query.eq('status', customerStatus);
            }

            const { count, error } = await query;
            if (!error) {
                setRecipientCount(count);
            }
        };

        if (step === 2) {
            estimateRecipients();
        }
    }, [customerType, customerStatus, step]);

    const handleSave = async (targetStatus: Campaign['status'] = 'draft') => {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle();
        if (!profile) return;

        const payload = {
            company_id: profile.company_id,
            name,
            channel,
            subject: channel === 'email' ? subject : null,
            body,
            status: targetStatus,
            scheduled_at: targetStatus === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
            filters: {
                customer_type: customerType,
                status: customerStatus
            },
            created_by: user.id
        };

        let result;
        if (isEditing) {
            result = await supabase
                .from('campaigns')
                .update(payload)
                .eq('id', id)
                .eq('company_id', profile.company_id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('campaigns')
                .insert(payload)
                .select()
                .single();
        }

        const { error } = result;

        if (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Error al guardar la campaña', variant: 'destructive' });
            setLoading(false);
            return;
        }

        toast({
            title: isEditing ? 'Campaña actualizada' : 'Campaña creada',
            description: 'La campaña se ha guardado correctamente.'
        });
        navigate('/admin/messages/campaigns');
    };

    // ─── Step 1: Channel + Content ─────────────────────────────
    const renderStep1 = () => (
        <div>
            {/* Channel Selector */}
            <p style={STYLES.label}>Canal de envío</p>
            <div style={STYLES.channelGrid}>
                <div
                    style={STYLES.channelCard(channel === 'email', '#0ea5e9')}
                    onClick={() => setChannel('email')}
                    onMouseEnter={e => {
                        if (channel !== 'email') (e.currentTarget.style.borderColor = '#93c5fd');
                    }}
                    onMouseLeave={e => {
                        if (channel !== 'email') (e.currentTarget.style.borderColor = '#e2e8f0');
                    }}
                >
                    {channel === 'email' && (
                        <div style={{ ...STYLES.channelCheck, background: '#0ea5e9' }}>
                            <Check style={{ width: 14, height: 14, color: '#fff' }} />
                        </div>
                    )}
                    <div style={STYLES.channelIconWrapper(channel === 'email', '#dbeafe')}>
                        <Mail style={{ width: 24, height: 24, color: channel === 'email' ? '#0ea5e9' : '#94a3b8' }} />
                    </div>
                    <p style={STYLES.channelName(channel === 'email')}>Email</p>
                    <p style={STYLES.channelDesc}>Envío masivo por correo electrónico con asunto personalizado</p>
                </div>

                <div
                    style={STYLES.channelCard(channel === 'whatsapp', '#22c55e')}
                    onClick={() => setChannel('whatsapp')}
                    onMouseEnter={e => {
                        if (channel !== 'whatsapp') (e.currentTarget.style.borderColor = '#86efac');
                    }}
                    onMouseLeave={e => {
                        if (channel !== 'whatsapp') (e.currentTarget.style.borderColor = '#e2e8f0');
                    }}
                >
                    {channel === 'whatsapp' && (
                        <div style={{ ...STYLES.channelCheck, background: '#22c55e' }}>
                            <Check style={{ width: 14, height: 14, color: '#fff' }} />
                        </div>
                    )}
                    <div style={STYLES.channelIconWrapper(channel === 'whatsapp', '#dcfce7')}>
                        <Phone style={{ width: 24, height: 24, color: channel === 'whatsapp' ? '#22c55e' : '#94a3b8' }} />
                    </div>
                    <p style={STYLES.channelName(channel === 'whatsapp')}>WhatsApp</p>
                    <p style={STYLES.channelDesc}>Mensajes directos por WhatsApp Business API</p>
                </div>
            </div>

            {/* Campaign Name */}
            <div style={STYLES.formGroup}>
                <label style={STYLES.label}>Nombre de la Campaña (Interno)</label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Newsletter Abril 2026"
                    style={{ borderRadius: '10px' }}
                />
            </div>

            {/* Subject (email only) */}
            {channel === 'email' && (
                <div style={STYLES.formGroup}>
                    <label style={STYLES.label}>Asunto del Email</label>
                    <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Asunto atractivo para el cliente"
                        style={{ borderRadius: '10px' }}
                    />
                </div>
            )}

            {/* Body */}
            <div style={STYLES.formGroup}>
                <label style={STYLES.label}>
                    {channel === 'whatsapp' ? 'Mensaje de WhatsApp' : 'Cuerpo del Email'}
                </label>
                <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={channel === 'whatsapp' ? 'Escribe tu mensaje de WhatsApp...' : 'Escribe el contenido del email...'}
                    rows={8}
                    style={{ borderRadius: '10px', resize: 'vertical' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
                    Puedes usar variables como {'{{nombre}}'}, {'{{empresa}}'} (Próximamente)
                </p>
            </div>
        </div>
    );

    // ─── Step 2: Audience ──────────────────────────────────────
    const renderStep2 = () => (
        <div>
            <div style={STYLES.audienceBox}>
                <p style={STYLES.audienceTitle}>
                    <Users style={{ width: 18, height: 18 }} />
                    Destinatarios Estimados: {recipientCount !== null ? recipientCount : 'Calculando...'}
                </p>
                <p style={STYLES.audienceSubtitle}>
                    Clientes que recibirán este mensaje según los filtros seleccionados.
                </p>
            </div>

            <div style={STYLES.filtersGrid}>
                <div style={STYLES.formGroup}>
                    <label style={STYLES.label}>Tipo de Cliente</label>
                    <Select value={customerType} onValueChange={setCustomerType}>
                        <SelectTrigger style={{ borderRadius: '10px' }}>
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="empresa">Empresas</SelectItem>
                            <SelectItem value="particular">Particulares</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div style={STYLES.formGroup}>
                    <label style={STYLES.label}>Estado del Cliente</label>
                    <Select value={customerStatus} onValueChange={setCustomerStatus}>
                        <SelectTrigger style={{ borderRadius: '10px' }}>
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="prospecto">Prospecto</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                            <SelectItem value="perdido">Perdido</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );

    // ─── Step 3: Review ────────────────────────────────────────
    const renderStep3 = () => (
        <div>
            <div style={STYLES.reviewGrid}>
                <div style={STYLES.reviewCard}>
                    <p style={STYLES.reviewLabel}>Detalles de la Campaña</p>
                    <div style={STYLES.reviewItem}>
                        <p style={STYLES.reviewItemLabel}>Nombre</p>
                        <p style={STYLES.reviewItemValue}>{removeEmojis(name)}</p>
                    </div>
                    <div style={STYLES.reviewItem}>
                        <p style={STYLES.reviewItemLabel}>Canal</p>
                        <p style={STYLES.reviewItemValue}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                background: channel === 'whatsapp' ? '#dcfce7' : '#dbeafe',
                                color: channel === 'whatsapp' ? '#15803d' : '#1d4ed8',
                            }}>
                                {channel === 'whatsapp' ? <Phone style={{ width: 12, height: 12 }} /> : <Mail style={{ width: 12, height: 12 }} />}
                                {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                            </span>
                        </p>
                    </div>
                    {channel === 'email' && subject && (
                        <div style={STYLES.reviewItem}>
                            <p style={STYLES.reviewItemLabel}>Asunto</p>
                            <p style={STYLES.reviewItemValue}>{removeEmojis(subject)}</p>
                        </div>
                    )}
                </div>
                <div style={STYLES.reviewCard}>
                    <p style={STYLES.reviewLabel}>Audiencia</p>
                    <div style={STYLES.reviewItem}>
                        <p style={STYLES.reviewItemLabel}>Tipo</p>
                        <p style={STYLES.reviewItemValue}>{customerType === 'all' ? 'Todos' : customerType}</p>
                    </div>
                    <div style={STYLES.reviewItem}>
                        <p style={STYLES.reviewItemLabel}>Estado</p>
                        <p style={STYLES.reviewItemValue}>{customerStatus === 'all' ? 'Todos' : customerStatus}</p>
                    </div>
                    <div style={STYLES.reviewItem}>
                        <p style={STYLES.reviewItemLabel}>Destinatarios</p>
                        <p style={{ ...STYLES.reviewItemValue, color: '#0ea5e9', fontWeight: 700, fontSize: '1.125rem' }}>
                            {recipientCount ?? '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scheduling Section */}
            <div style={{ ...STYLES.reviewCard, marginBottom: '1.5rem', borderLeft: '4px solid #0ea5e9' }}>
                <p style={{ ...STYLES.reviewLabel, color: '#0ea5e9', marginBottom: '0.5rem' }}>Programación del Envío</p>
                <div style={STYLES.formGroup}>
                    <label style={STYLES.label}>Fecha y Hora de Envío</label>
                    <Input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        style={{ borderRadius: '10px', maxWidth: '300px' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                        Selecciona cuándo quieres que se envíe esta campaña. Si lo dejas vacío, se guardará como borrador.
                    </p>
                </div>
            </div>

            {/* Message Preview */}
            <div style={{ marginTop: '0.5rem' }}>
                <p style={{ ...STYLES.reviewLabel, marginBottom: '1rem' }}>Vista Previa del Mensaje</p>

                {channel === 'whatsapp' ? (
                    /* WhatsApp Phone Preview */
                    <div style={STYLES.phonePreview}>
                        <div style={STYLES.phoneHeader}>
                            <div style={STYLES.phoneAvatar}>
                                <Users style={{ width: 16, height: 16, color: '#fff' }} />
                            </div>
                            <div>
                                <p style={{ margin: 0, color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>Tu Empresa</p>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '0.6875rem' }}>en línea</p>
                            </div>
                        </div>
                        <div style={STYLES.phoneMessages}>
                            {body ? (
                                <div style={STYLES.phoneBubble}>
                                    {body}
                                    <p style={STYLES.phoneBubbleTime}>
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                                    </p>
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#8696a0', fontSize: '0.75rem' }}>Sin contenido</p>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Email Preview */
                    <div style={STYLES.emailPreview}>
                        <div style={STYLES.emailHeader}>
                            <p style={STYLES.emailMeta}>De: tu-empresa@opspilot.com</p>
                            <p style={STYLES.emailMeta}>Para: {'{{nombre}}'} &lt;{'{{email}}'}&gt;</p>
                            <p style={STYLES.emailSubject}>{subject || '(Sin asunto)'}</p>
                        </div>
                        <div style={STYLES.emailBody}>
                            {body || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(Sin contenido)</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (loading && isEditing) {
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#0ea5e9' }} />
            </div>
        );
    }

    return (
        <div style={STYLES.pageWrapper as React.CSSProperties}>
            <div style={STYLES.page}>
                {/* Header */}
                <div style={STYLES.headerRow}>
                    <button
                        style={STYLES.backBtn}
                        onClick={() => navigate('/admin/messages/campaigns')}
                        onMouseEnter={e => { (e.currentTarget.style.background = '#f8fafc'); }}
                        onMouseLeave={e => { (e.currentTarget.style.background = '#fff'); }}
                    >
                        <ArrowLeft style={{ width: 18, height: 18, color: '#475569' }} />
                    </button>
                </div>

                {/* Steps */}
                <div style={STYLES.stepsBar}>
                    <button style={STYLES.stepBtn(step === 1)} onClick={() => setStep(1)}>
                        <FileText style={{ width: 15, height: 15 }} /> Canal y Contenido
                    </button>
                    <span style={STYLES.stepArrow}>→</span>
                    <button
                        style={{ ...STYLES.stepBtn(step === 2), opacity: !name ? 0.5 : 1, cursor: !name ? 'not-allowed' : 'pointer' }}
                        onClick={() => name && setStep(2)}
                    >
                        <Users style={{ width: 15, height: 15 }} /> Audiencia
                    </button>
                    <span style={STYLES.stepArrow}>→</span>
                    <button
                        style={{ ...STYLES.stepBtn(step === 3), opacity: !name ? 0.5 : 1, cursor: !name ? 'not-allowed' : 'pointer' }}
                        onClick={() => name && setStep(3)}
                    >
                        <CalendarIcon style={{ width: 15, height: 15 }} /> Revisión
                    </button>
                </div>

                {/* Step Content */}
                <div style={STYLES.formCard}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

                {/* Footer Actions */}
                <div style={STYLES.footer}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/admin/messages/campaigns')}
                    >
                        Cancelar
                    </button>

                    <div style={STYLES.footerRight}>
                        {step > 1 && (
                            <button className="btn btn-secondary" onClick={() => setStep(p => (p - 1) as (1 | 2 | 3))}>
                                Atrás
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                className="btn btn-primary"
                                style={{ opacity: !name ? 0.5 : 1, cursor: !name ? 'not-allowed' : 'pointer' }}
                                onClick={() => name && setStep(p => (p + 1) as (1 | 2 | 3))}
                                disabled={!name}
                            >
                                Siguiente
                            </button>
                        ) : (
                            <>
                                <button className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={loading}>
                                    <Save style={{ width: 15, height: 15 }} />
                                    Guardar Borrador
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ opacity: !scheduledAt ? 0.5 : 1, cursor: !scheduledAt ? 'not-allowed' : 'pointer' }}
                                    onClick={() => scheduledAt && handleSave('scheduled')}
                                    disabled={loading || !scheduledAt}
                                >
                                    <Send style={{ width: 15, height: 15 }} />
                                    Programar Envío
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
