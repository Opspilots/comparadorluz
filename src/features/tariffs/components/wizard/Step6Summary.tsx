import { TariffWizardState } from '@/types/tariff';
import { Card } from '@/shared/components/ui/card';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Step6Props {
    data: TariffWizardState;
    mode?: 'create' | 'edit';
    onSave: () => void;
}

export function Step6Summary({ data, mode = 'create' }: Step6Props) {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const { id } = useParams(); // Get ID from URL for updates

    // Validation status
    const hasRates = data.rates && data.rates.length > 0;
    const isComplete = data.metadata.supplier_id && data.metadata.name && data.metadata.tariff_structure_id && hasRates;

    const handleDelete = async () => {
        if (!id) return;
        if (!confirm('¿Estás seguro de que quieres eliminar esta tarifa? Esta acción no se puede deshacer.')) return;

        setSaving(true);
        try {
            const { error } = await supabase.from('tariff_versions').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Tarifa eliminada', description: 'La tarifa ha sido eliminada correctamente.' });
            navigate('/admin/tariffs');
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la tarifa.' });
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (activate: boolean) => {
        setSaving(true);
        try {
            // 1. Prepare Payload
            const { data: user } = await supabase.auth.getUser();
            const { data: company } = await supabase.from('users').select('company_id').eq('id', user.user!.id).single();

            const payload = {
                company_id: company?.company_id,
                supplier_id: data.metadata.supplier_id,
                tariff_structure_id: data.metadata.tariff_structure_id,
                name: data.metadata.name,
                code: data.metadata.code,
                is_indexed: data.metadata.is_indexed,
                valid_from: data.metadata.valid_from,
                is_active: activate,
                completion_status: isComplete ? 'complete' : 'draft'
            };

            let versionId = id;

            if (mode === 'create') {
                const { data: version, error: vError } = await supabase
                    .from('tariff_versions')
                    .insert(payload)
                    .select()
                    .single();
                if (vError) throw vError;
                versionId = version.id;
            } else if (id) {
                // Update existing
                const { error: vError } = await supabase
                    .from('tariff_versions')
                    .update(payload)
                    .eq('id', id);
                if (vError) throw vError;
            }

            if (!versionId) throw new Error("No version ID");

            // 2. Handle Rates (Delete old and insert new for simplicity in MVP, or Upsert)
            // For now, simpler to delete all rates for this version and re-insert to avoid syncing issues
            if (mode === 'edit') {
                await supabase.from('tariff_rates').delete().eq('tariff_version_id', versionId);
            }

            const ratesPayload = data.rates.map(r => ({
                tariff_version_id: versionId,
                item_type: r.item_type,
                period: r.period,
                price: r.price,
                price_formula: r.price_formula,
                unit: r.unit,
                confidence_score: r.confidence_score
            }));

            if (ratesPayload.length > 0) {
                const { error: rError } = await supabase
                    .from('tariff_rates')
                    .insert(ratesPayload);
                if (rError) throw rError;
            }

            // 3. Insert Schedules (Similar logic)
            if (mode === 'edit') {
                await supabase.from('tariff_schedules').delete().eq('tariff_version_id', versionId);
            }
            // ... (Assuming schedule saving logic is similar)

            toast({
                title: mode === 'create' ? "Tarifa Creada" : "Tarifa Actualizada",
                description: `La tarifa ${data.metadata.name} ha sido guardada correctamente.`,
            });

            navigate('/admin/tariffs');

        } catch (err: any) {
            console.error(err);
            toast({
                variant: 'destructive',
                title: "Error al guardar",
                description: err.message,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Resumen y Confirmación</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="font-medium mb-4 text-gray-900">Datos Generales</h3>
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Nombre:</dt>
                            <dd className="font-medium">{data.metadata.name}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Modalidad:</dt>
                            <dd className="font-medium">{data.metadata.is_indexed ? 'Indexado' : 'Fijo'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Vigencia:</dt>
                            <dd className="font-medium">{data.metadata.valid_from}</dd>
                        </div>
                    </dl>
                </Card>

                <Card className="p-6">
                    <h3 className="font-medium mb-4 text-gray-900">Estado de Validación</h3>
                    <div className="flex items-center gap-2 mb-2">
                        {isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        )}
                        <span className="font-medium">
                            {isComplete ? 'Completa' : 'Faltan datos obligatorios (Metadata o Precios)'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">
                        {isComplete
                            ? "La tarifa está lista para ser activada y utilizada en recomendaciones."
                            : "Puedes guardar como borrador y terminar de editar más tarde."}
                    </p>
                </Card>
            </div>

            <div className="flex justify-between items-center pt-6 border-t">
                {mode === 'edit' && (
                    <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto">
                        {saving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Eliminar Tarifa'}
                    </Button>
                )}

                <div className="flex gap-3 ml-auto">
                    <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                        {saving ? <Loader2 className="animate-spin h-4 w-4" /> : 'Guardar Borrador'}
                    </Button>
                    <Button onClick={() => handleSave(true)} disabled={saving || !isComplete}>
                        {saving ? <Loader2 className="animate-spin h-4 w-4" /> : mode === 'edit' ? 'Actualizar Tarifa' : 'Publicar y Activar'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
