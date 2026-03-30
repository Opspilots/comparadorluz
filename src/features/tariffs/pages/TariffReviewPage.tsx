
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { TariffBatch, TariffVersion, TariffRate } from '@/shared/types';
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TariffComponentsEditor } from '../components/TariffComponentsEditor';
import { useState, useEffect } from 'react';

export default function TariffReviewPage() {
    const { batchId } = useParams<{ batchId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase.from('users').select('company_id').eq('id', user.id).maybeSingle().then(({ data: profile }) => {
                if (profile?.company_id) setCompanyId(profile.company_id);
            });
        });
    }, []);

    const { data: batch, isLoading: isBatchLoading } = useQuery({
        queryKey: ['tariff-batch', batchId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tariff_batches')
                .select('*')
                .eq('id', batchId)
                .single();
            if (error) throw error;
            return data as TariffBatch;
        },
        enabled: !!batchId
    });

    const { data: versions, isLoading: isVersionsLoading } = useQuery({
        queryKey: ['tariff-batch-versions', batchId, companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tariff_versions')
                .select('*, tariff_rates(*)')
                .eq('batch_id', batchId)
                .eq('company_id', companyId!);
            if (error) throw error;
            return data as (TariffVersion & { tariff_rates: TariffRate[] })[];
        },
        enabled: !!batchId && !!companyId
    });

    const publishMutation = useMutation({
        mutationFn: async () => {
            // Read from React Query cache at call time to avoid stale closure
            const currentVersions = queryClient.getQueryData<(TariffVersion & { tariff_rates: TariffRate[] })[]>(
                ['tariff-batch-versions', batchId]
            );
            if (!currentVersions?.length) throw new Error('No hay versiones cargadas');

            // 1. Update batch status
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle();
            if (!profile?.company_id) throw new Error('Perfil no encontrado');

            const { error: batchError } = await supabase
                .from('tariff_batches')
                .update({
                    status: 'published',
                    published_at: new Date().toISOString(),
                    published_by: user.id
                })
                .eq('id', batchId)
                .eq('company_id', profile.company_id);

            if (batchError) throw batchError;

            // 2. Activate only versions that have at least one rate
            const { data: validVersionIds } = await supabase
                .from('tariff_rates')
                .select('tariff_version_id')
                .in('tariff_version_id', currentVersions.map(v => v.id));

            const idsWithRates = [...new Set((validVersionIds || []).map(r => r.tariff_version_id))];

            if (idsWithRates.length > 0) {
                const { error: versionError } = await supabase
                    .from('tariff_versions')
                    .update({ is_active: true })
                    .in('id', idsWithRates)
                    .eq('company_id', profile.company_id);

                if (versionError) throw versionError;
            }
        },
        onSuccess: () => {
            toast({ title: 'Lote publicado correctamente', description: 'Las tarifas ya están activas.' });
            queryClient.invalidateQueries({ queryKey: ['tariff-batch', batchId] });
            queryClient.invalidateQueries({ queryKey: ['tariff-batch-versions', batchId] });
            navigate('/admin/tariffs');
        },
        onError: (err) => {
            toast({ variant: 'destructive', title: 'Error al publicar', description: err.message });
        }
    });

    if (isBatchLoading || isVersionsLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={32} className="animate-spin" /></div>;
    }

    if (!batch) return <div>Lote no encontrado</div>;

    const selectedVersion = versions?.find(v => v.id === selectedVersionId) || versions?.[0];

    return (
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/admin/tariffs')}
                    style={{
                        padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        Revisión de Tarifas
                        <span style={{
                            padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
                            border: '1px solid #e2e8f0', textTransform: 'capitalize'
                        }}>
                            {batch.status.replace('_', ' ')}
                        </span>
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>ID: {batch.id}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
                    {batch.status !== 'published' && (
                        <button
                            onClick={() => publishMutation.mutate()}
                            disabled={publishMutation.isPending}
                            style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                                padding: '0.5rem 1rem', backgroundColor: '#16a34a', color: 'white',
                                border: 'none', cursor: publishMutation.isPending ? 'not-allowed' : 'pointer',
                                opacity: publishMutation.isPending ? 0.7 : 1
                            }}
                        >
                            {publishMutation.isPending ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} /> : <CheckCircle size={16} style={{ marginRight: '0.5rem' }} />}
                            Publicar Tarifas
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
                {/* Sidebar: List of File/Versions */}
                <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, lineHeight: 1 }}>Tarifas Extraídas</h3>
                            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.375rem 0 0 0' }}>{versions?.length} tarifas encontradas</p>
                        </div>
                        <div style={{ padding: '1.5rem', paddingTop: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {versions?.map((version) => (
                                    <button
                                        key={version.id}
                                        onClick={() => setSelectedVersionId(version.id)}
                                        style={{
                                            width: '100%', textAlign: 'left', padding: '0.75rem',
                                            borderRadius: '0.375rem', border: `1px solid ${selectedVersion?.id === version.id ? '#93c5fd' : 'transparent'}`,
                                            transition: 'all 0.15s',
                                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                            backgroundColor: selectedVersion?.id === version.id ? '#eff6ff' : 'transparent',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedVersion?.id !== version.id) e.currentTarget.style.backgroundColor = '#f8fafc';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedVersion?.id !== version.id) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <FileText size={20} style={{ color: '#94a3b8', marginTop: '0.125rem' }} />
                                        <div>
                                            <p style={{ fontWeight: 500, fontSize: '0.875rem', margin: 0 }}>{version.tariff_name || 'Sin Nombre'}</p>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{version.supplier_name || 'Proveedor desconocido'}</p>
                                            <span style={{
                                                display: 'inline-block', marginTop: '0.5rem', padding: '0 0.5rem',
                                                borderRadius: '9999px', fontSize: '10px', fontWeight: 500,
                                                backgroundColor: '#f1f5f9', color: '#1f2937', height: '1.25rem',
                                                lineHeight: '1.25rem'
                                            }}>
                                                {version.tariff_type}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                                {versions?.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                                        No se encontraron tarifas válidas en este lote.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content: Editor */}
                <div style={{ gridColumn: 'span 8' }}>
                    {selectedVersion ? (
                        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, lineHeight: 1 }}>{selectedVersion.tariff_name}</h3>
                                        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.375rem 0 0 0' }}>{selectedVersion.supplier_name || 'Proveedor desconocido'} • {selectedVersion.tariff_type}</p>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
                                        <p style={{ margin: 0 }}>Válido desde: {selectedVersion.valid_from}</p>
                                        <p style={{ margin: 0 }}>Válido hasta: {selectedVersion.valid_to || 'Indefinido'}</p>
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '1.5rem', paddingTop: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                    <AlertTriangle size={20} style={{ color: '#eab308', marginRight: '0.5rem' }} />
                                    <span style={{ fontSize: '0.875rem', color: '#a16207', fontWeight: 500 }}>
                                        Verifica que los precios coincidan con el PDF original antes de publicar.
                                    </span>
                                </div>

                                <div style={{ marginTop: '1.5rem' }}>
                                    <TariffComponentsEditor
                                        tariffVersionId={selectedVersion.id}
                                        rates={selectedVersion.tariff_rates || []}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '3rem', color: '#64748b', border: '2px dashed #d1d5db', borderRadius: '0.5rem'
                        }}>
                            Selecciona una tarifa para editar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
