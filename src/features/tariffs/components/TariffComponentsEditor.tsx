
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { TariffComponent } from '@/shared/types';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

                const updateData: Partial<TariffComponent> = {};
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
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Energy Prices */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'var(--surface)' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                    Término de Energía (€/kWh)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    {energyComponents.map((comp) => (
                        <div key={comp.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label htmlFor={comp.id} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Periodo {comp.period}</label>
                            <input
                                id={comp.id}
                                type="number"
                                step="0.000001"
                                {...register(comp.id, { valueAsNumber: true, required: true })}
                                style={{
                                    display: 'flex', height: '2.5rem', width: '100%', borderRadius: '0.375rem',
                                    border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem', color: 'var(--text-main)'
                                }}
                            />
                        </div>
                    ))}
                    {energyComponents.length === 0 && <p style={{ fontSize: '0.875rem', color: '#6b7280', gridColumn: '1 / -1' }}>No hay componentes de energía definidos.</p>}
                </div>
            </div>

            {/* Power Prices */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'var(--surface)' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                    Término de Potencia (€/kW/año)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    {powerComponents.map((comp) => (
                        <div key={comp.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label htmlFor={comp.id} style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Periodo {comp.period}</label>
                            <input
                                id={comp.id}
                                type="number"
                                step="0.01"
                                {...register(comp.id, { valueAsNumber: true, required: true })}
                                style={{
                                    display: 'flex', height: '2.5rem', width: '100%', borderRadius: '0.375rem',
                                    border: '1px solid #e5e7eb', backgroundColor: 'white', padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    ))}
                    {powerComponents.length === 0 && <p style={{ fontSize: '0.875rem', color: '#6b7280', gridColumn: '1 / -1' }}>No hay componentes de potencia definidos.</p>}
                </div>
            </div>

            {/* Fixed Fee */}
            {fixedFeeComponent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'white' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#64748b' }} />
                        Término Fijo (€/mes)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label htmlFor={fixedFeeComponent?.id} style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Cuota Mensual</label>
                            <input
                                id={fixedFeeComponent?.id}
                                type="number"
                                step="0.01"
                                {...register(fixedFeeComponent?.id, { valueAsNumber: true })}
                                style={{
                                    display: 'flex', height: '2.5rem', width: '100%', borderRadius: '0.375rem',
                                    border: '1px solid #e5e7eb', backgroundColor: 'white', padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem' }}>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500,
                        padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: 'white',
                        border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1
                    }}
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} /> : <Save size={16} style={{ marginRight: '0.5rem' }} />}
                    Guardar Cambios
                </button>
            </div>
        </form>
    );
}
