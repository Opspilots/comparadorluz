
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { TariffComponent } from '@/shared/types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface TariffComponentsEditorProps {
    tariffVersionId: string;
    components: TariffComponent[];
    onSaveSuccess?: () => void;
}

interface ComponentFormValues {
    [key: string]: number; // componentId -> price
}

export function TariffComponentsEditor({ components, onSaveSuccess }: TariffComponentsEditorProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Group components by type
    const energyComponents = components.filter(c => c.component_type === 'energy_price').sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    const powerComponents = components.filter(c => c.component_type === 'power_price').sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    const fixedFeeComponent = components.find(c => c.component_type === 'fixed_fee');

    const { register, handleSubmit, formState: { isSubmitting } } = useForm<ComponentFormValues>({
        defaultValues: {
            ...components.reduce((acc, c) => ({
                ...acc,
                [c.id]: c.price_eur_kwh ?? c.price_eur_kw_year ?? c.fixed_price_eur_month ?? 0
            }), {})
        }
    });

    const updateComponentsMutation = useMutation({
        mutationFn: async (values: ComponentFormValues) => {
            const updates = Object.entries(values).map(async ([id, price]) => {
                const original = components.find(c => c.id === id);
                if (!original) return;

                const updateData: any = {};
                if (original.component_type === 'energy_price') updateData.price_eur_kwh = price;
                if (original.component_type === 'power_price') updateData.price_eur_kw_year = price;
                if (original.component_type === 'fixed_fee') updateData.fixed_price_eur_month = price;

                const { error } = await supabase
                    .from('tariff_components')
                    .update(updateData)
                    .eq('id', id);

                if (error) throw error;
            });

            await Promise.all(updates);
        },
        onSuccess: () => {
            toast({ title: 'Precios actualizados correctamente' });
            queryClient.invalidateQueries({ queryKey: ['tariff-batch-details'] });
            onSaveSuccess?.();
        },
        onError: (err) => {
            toast({ variant: 'destructive', title: 'Error al actualizar', description: err.message });
        }
    });

    const onSubmit = (data: ComponentFormValues) => {
        updateComponentsMutation.mutate(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Energy Prices */}
            <div className="space-y-4 border p-4 rounded-lg bg-white">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Término de Energía (€/kWh)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {energyComponents.map((comp) => (
                        <div key={comp.id} className="space-y-2">
                            <Label htmlFor={comp.id}>Periodo {comp.period}</Label>
                            <Input
                                id={comp.id}
                                type="number"
                                step="0.000001"
                                {...register(comp.id, { valueAsNumber: true, required: true })}
                            />
                        </div>
                    ))}
                    {energyComponents.length === 0 && <p className="text-sm text-gray-500 col-span-full">No hay componentes de energía definidos.</p>}
                </div>
            </div>

            {/* Power Prices */}
            <div className="space-y-4 border p-4 rounded-lg bg-white">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    Término de Potencia (€/kW/año)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {powerComponents.map((comp) => (
                        <div key={comp.id} className="space-y-2">
                            <Label htmlFor={comp.id}>Periodo {comp.period}</Label>
                            <Input
                                id={comp.id}
                                type="number"
                                step="0.01"
                                {...register(comp.id, { valueAsNumber: true, required: true })}
                            />
                        </div>
                    ))}
                    {powerComponents.length === 0 && <p className="text-sm text-gray-500 col-span-full">No hay componentes de potencia definidos.</p>}
                </div>
            </div>

            {/* Fixed Fee */}
            {fixedFeeComponent && (
                <div className="space-y-4 border p-4 rounded-lg bg-white">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                        Término Fijo (€/mes)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor={fixedFeeComponent.id}>Cuota Mensual</Label>
                            <Input
                                id={fixedFeeComponent.id}
                                type="number"
                                step="0.01"
                                {...register(fixedFeeComponent.id, { valueAsNumber: true })}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Cambios
                </Button>
            </div>
        </form>
    );
}
