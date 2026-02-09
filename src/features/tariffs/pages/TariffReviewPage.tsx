
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { TariffBatch, TariffVersion } from '@/shared/types';
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TariffComponentsEditor } from '../components/TariffComponentsEditor';
import { useState } from 'react';

export default function TariffReviewPage() {
    const { batchId } = useParams<{ batchId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

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
        queryKey: ['tariff-batch-versions', batchId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tariff_versions')
                .select('*, tariff_components(*)')
                .eq('batch_id', batchId);
            if (error) throw error;
            return data as TariffVersion[];
        },
        enabled: !!batchId
    });

    const publishMutation = useMutation({
        mutationFn: async () => {
            // 1. Update batch status
            const { error: batchError } = await supabase
                .from('tariff_batches')
                .update({
                    status: 'published',
                    published_at: new Date().toISOString(),
                    published_by: (await supabase.auth.getUser()).data.user?.id
                })
                .eq('id', batchId);

            if (batchError) throw batchError;

            // 2. Activate versions (should be active by default but ensures it)
            const { error: versionError } = await supabase
                .from('tariff_versions')
                .update({ is_active: true })
                .eq('batch_id', batchId);

            if (versionError) throw versionError;
        },
        onSuccess: () => {
            toast({ title: 'Lote publicado correctamente', description: 'Las tarifas ya están activas.' });
            queryClient.invalidateQueries({ queryKey: ['tariff-batch'] });
            navigate('/admin/tariffs');
        },
        onError: (err) => {
            toast({ variant: 'destructive', title: 'Error al publicar', description: err.message });
        }
    });

    if (isBatchLoading || isVersionsLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (!batch) return <div>Lote no encontrado</div>;

    const selectedVersion = versions?.find(v => v.id === selectedVersionId) || versions?.[0];

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tariffs')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        Revisión de Tarifas
                        <Badge variant="outline" className="text-sm">
                            {batch.status.replace('_', ' ')}
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground">ID: {batch.id}</p>
                </div>
                <div className="ml-auto flex gap-3">
                    {batch.status !== 'published' && (
                        <Button
                            onClick={() => publishMutation.mutate()}
                            disabled={publishMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Publicar Tarifas
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Sidebar: List of File/Versions */}
                <div className="md:col-span-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Tarifas Extraídas</CardTitle>
                            <CardDescription>{versions?.length} tarifas encontradas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {versions?.map((version) => (
                                <button
                                    key={version.id}
                                    onClick={() => setSelectedVersionId(version.id)}
                                    className={`w-full text-left p-3 rounded-md border transition-colors flex items-start gap-3 ${selectedVersion?.id === version.id
                                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300'
                                        : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">{version.tariff_name || 'Sin Nombre'}</p>
                                        <p className="text-xs text-muted-foreground">{version.supplier_name || 'Proveedor desconocido'}</p>
                                        <Badge variant="secondary" className="mt-2 text-[10px] h-5">
                                            {version.tariff_type}
                                        </Badge>
                                    </div>
                                </button>
                            ))}
                            {versions?.length === 0 && (
                                <div className="text-center p-4 text-sm text-muted-foreground">
                                    No se encontraron tarifas válidas en este lote.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content: Editor */}
                <div className="md:col-span-8">
                    {selectedVersion ? (
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between">
                                    <div>
                                        <CardTitle>{selectedVersion.tariff_name}</CardTitle>
                                        <CardDescription>{selectedVersion.supplier_name || 'Proveedor desconocido'} • {selectedVersion.tariff_type}</CardDescription>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <p>Válido desde: {selectedVersion.valid_from}</p>
                                        <p>Válido hasta: {selectedVersion.valid_to || 'Indefinido'}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <AlertTriangle className="w-5 h-5 text-yellow-500 mb-4 inline-block mr-2" />
                                <span className="text-sm text-yellow-700 font-medium">
                                    Verifica que los precios coincidan con el PDF original antes de publicar.
                                </span>

                                <div className="mt-6">
                                    <TariffComponentsEditor
                                        tariffVersionId={selectedVersion.id}
                                        components={selectedVersion.tariff_components || []}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full flex items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            Selecciona una tarifa para editar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
