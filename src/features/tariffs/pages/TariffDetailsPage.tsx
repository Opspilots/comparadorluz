import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Loader2, ArrowLeft, Edit, Trash2, Calendar, Zap, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function TariffDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [tariff, setTariff] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchTariff = async () => {
            try {
                const { data, error } = await supabase
                    .from('tariff_versions')
                    .select('*, tariff_rates(*), tariff_schedules(*), tariff_structures(*), suppliers(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setTariff(data);
            } catch (error) {
                console.error("Error loading tariff:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la tarifa.' });
            } finally {
                setLoading(false);
            }
        };
        fetchTariff();
    }, [id]);

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar esta tarifa?')) return;
        try {
            const { error } = await supabase.from('tariff_versions').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Tarifa eliminada' });
            navigate('/admin/tariffs');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' });
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!tariff) return <div>Tarifa no encontrada</div>;

    const energyRates = tariff.tariff_rates?.filter((r: any) => r.item_type === 'energy') || [];
    const powerRates = tariff.tariff_rates?.filter((r: any) => r.item_type === 'power') || [];

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tariffs')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {tariff.name}
                            <Badge variant={tariff.is_active ? 'default' : 'secondary'}>
                                {tariff.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                            <Zap className="w-4 h-4" /> {tariff.suppliers?.name}
                            <span className="mx-1">•</span>
                            <FileText className="w-4 h-4" /> {tariff.tariff_structures?.name} ({tariff.tariff_structures?.code})
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                    </Button>
                    <Button onClick={() => navigate(`/admin/tariffs/edit/${tariff.id}`)}>
                        <Edit className="w-4 h-4 mr-2" /> Editar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Info */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Detalles de Precios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="energy">
                            <TabsList className="mb-4">
                                <TabsTrigger value="energy">Energía</TabsTrigger>
                                <TabsTrigger value="power">Potencia</TabsTrigger>
                            </TabsList>

                            <TabsContent value="energy" className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {energyRates.map((rate: any) => (
                                        <div key={rate.id} className="p-3 bg-slate-50 rounded-lg border">
                                            <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">{rate.period}</div>
                                            <div className="text-lg font-bold text-blue-600">{rate.price} <span className="text-xs font-normal text-gray-500">{rate.unit}</span></div>
                                            {rate.price_formula && <div className="text-xs font-mono bg-gray-100 p-1 mt-1 rounded truncate" title={rate.price_formula}>{rate.price_formula}</div>}
                                        </div>
                                    ))}
                                    {energyRates.length === 0 && <p className="text-muted-foreground italic">Sin precios de energía definidos.</p>}
                                </div>
                            </TabsContent>

                            <TabsContent value="power" className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {powerRates.map((rate: any) => (
                                        <div key={rate.id} className="p-3 bg-slate-50 rounded-lg border">
                                            <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">{rate.period}</div>
                                            <div className="text-lg font-bold text-blue-600">{rate.price} <span className="text-xs font-normal text-gray-500">{rate.unit}</span></div>
                                        </div>
                                    ))}
                                    {powerRates.length === 0 && <p className="text-muted-foreground italic">Sin precios de potencia definidos.</p>}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Información</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-1">Tipo de Precio</span>
                                <span className="font-medium">{tariff.is_indexed ? 'Indexado' : 'Fijo'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Válida Desde</span>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium">{format(new Date(tariff.valid_from), 'dd/MM/yyyy')}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Código Interno</span>
                                <span className="font-medium font-mono">{tariff.code || '-'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Horarios</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {tariff.tariff_schedules?.length > 0
                                    ? `${tariff.tariff_schedules.length} reglas de horario definidas.`
                                    : 'Sin horarios personalizados (Usa defecto BOE).'}
                            </p>
                            <Button variant="link" className="px-0 text-blue-600 h-auto mt-2" onClick={() => navigate(`/admin/tariffs/edit/${tariff.id}`)}>
                                Ver Horarios Completos &rarr;
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
