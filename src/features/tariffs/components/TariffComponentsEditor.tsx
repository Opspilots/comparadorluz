import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { TariffRate } from '@/types/tariff';
import { Save, Loader2, Plus, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';

interface TariffComponentsEditorProps {
    tariffVersionId: string;
    rates: TariffRate[];
    onSaveSuccess?: () => void;
}

interface ComponentFormValues {
    [key: string]: number; // rateId -> price
}

export function TariffComponentsEditor({ tariffVersionId, rates, onSaveSuccess }: TariffComponentsEditorProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<string>("any");
    const [newDuration, setNewDuration] = useState<string>("12");

    // Group components by duration
    const componentsByDuration = useMemo(() => {
        const grouped = new Map<string, TariffRate[]>();

        // Initialize 'any' group
        grouped.set("any", []);

        rates.forEach(c => {
            const key = c.contract_duration ? c.contract_duration.toString() : "any";
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(c);
        });

        // Sort keys: 'any' first, then numeric ascending
        return new Map([...grouped.entries()].sort((a, b) => {
            if (a[0] === 'any') return -1;
            if (b[0] === 'any') return 1;
            return parseInt(a[0]) - parseInt(b[0]);
        }));
    }, [rates]);

    // Flatten default values for the form
    const defaultValues = useMemo(() => {
        return rates.reduce((acc, c) => ({
            ...acc,
            [c.id]: c.price ?? 0
        }), {});
    }, [rates]);

    const { register, handleSubmit, formState: { isSubmitting } } = useForm<ComponentFormValues>({
        defaultValues
    });

    // Reset form when components change (e.g. after adding duration)
    // useEffect(() => {
    //     reset(defaultValues);
    // }, [defaultValues, reset]);

    const updateComponentsMutation = useMutation({
        mutationFn: async (values: ComponentFormValues) => {
            const updates = Object.entries(values).map(async ([id, price]) => {
                const original = rates.find(c => c.id === id);
                if (!original) return;

                // Only update if changed (optimization optional)

                const { error } = await supabase
                    .from('tariff_rates')
                    .update({ price })
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

    const addDurationMutation = useMutation({
        mutationFn: async (durationMonths: number) => {
            // Find base structure from existing components (preferably 'any' or the first available)
            const baseComponents = componentsByDuration.get("any")?.length
                ? componentsByDuration.get("any")
                : rates.length > 0 ? rates : [];

            if (!baseComponents || baseComponents.length === 0) {
                throw new Error("No hay estructura base de tarifas para copiar.");
            }

            // Filter out components that are duration-specific from the base set if we are copying from a duration set
            // Ideally we copy the *structure* (periods, types) not the prices necessarily, but copying prices is a good default.

            // Get unique structure signatures (type + period)
            const uniqueTypes = new Set<string>();
            const componentsToCreate = baseComponents!.filter(c => {
                const signature = `${c.item_type}-${c.period}`;
                if (uniqueTypes.has(signature)) return false;
                uniqueTypes.add(signature);
                return true;
            });

            const newComponents = componentsToCreate.map(c => ({
                id: crypto.randomUUID(),
                tariff_version_id: tariffVersionId,
                item_type: c.item_type,
                period: c.period,
                price: c.price,
                unit: c.unit,
                contract_duration: durationMonths,
            }));

            const { error } = await supabase
                .from('tariff_rates')
                .insert(newComponents);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Nueva duración añadida' });
            queryClient.invalidateQueries({ queryKey: ['tariff-batch-details'] });
        },
        onError: (err) => {
            toast({ variant: 'destructive', title: 'Error al añadir duración', description: err.message });
        }
    });

    const deleteDurationMutation = useMutation({
        mutationFn: async (durationKey: string) => {
            if (durationKey === 'any') return;
            const duration = parseInt(durationKey);

            const { error } = await supabase
                .from('tariff_rates')
                .delete()
                .eq('tariff_version_id', tariffVersionId)
                .eq('contract_duration', duration);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Duración eliminada' });
            setActiveTab("any");
            queryClient.invalidateQueries({ queryKey: ['tariff-batch-details'] });
        },
        onError: (err) => {
            toast({ variant: 'destructive', title: 'Error al eliminar', description: err.message });
        }
    });


    const onSubmit = (data: ComponentFormValues) => {
        updateComponentsMutation.mutate(data);
    };

    const handleAddDuration = () => {
        const months = parseInt(newDuration);
        if (isNaN(months) || months <= 0) return;
        addDurationMutation.mutate(months);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                        <TabsList className="bg-slate-100 p-1 rounded-lg">
                            {Array.from(componentsByDuration.keys()).map(key => (
                                <TabsTrigger
                                    key={key}
                                    value={key}
                                    className="px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-medium"
                                >
                                    {key === 'any' ? 'Estándar (Cualquier Duración)' : `${key} Meses`}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="flex items-center gap-2 ml-2">
                            <input
                                type="number"
                                className="w-16 px-2 py-1 text-sm border rounded-md"
                                placeholder="Meses"
                                value={newDuration}
                                onChange={(e) => setNewDuration(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={handleAddDuration}
                                disabled={addDurationMutation.isPending}
                                className="p-2 text-primary hover:bg-slate-100 rounded-full transition-colors"
                                title="Añadir precios para otra duración"
                            >
                                {addDurationMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            </button>
                        </div>
                    </div>

                    {Array.from(componentsByDuration.entries()).map(([key, groupComponents]) => (
                        <TabsContent key={key} value={key} className="space-y-6 animate-in fade-in-50 duration-300">

                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock size={16} />
                                    <span>
                                        Configurando precios para contratos de: <strong>{key === 'any' ? 'Cualquier duración' : `${key} meses`}</strong>
                                    </span>
                                </div>
                                {key !== 'any' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm('¿Estás seguro de querer eliminar estos precios específicos?')) {
                                                deleteDurationMutation.mutate(key);
                                            }
                                        }}
                                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 px-2 py-1 bg-white border border-red-100 rounded hover:bg-red-50"
                                    >
                                        <Trash2 size={12} /> Eliminar duración
                                    </button>
                                )}
                            </div>

                            <TariffPricesGrid
                                rates={groupComponents}
                                register={register}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
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

// Subcomponent for cleaner rendering
import { UseFormRegister } from 'react-hook-form';
// ...
function TariffPricesGrid({ rates, register }: { rates: TariffRate[], register: UseFormRegister<ComponentFormValues> }) {
    const energyComponents = rates.filter(c => c.item_type === 'energy').sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    const powerComponents = rates.filter(c => c.item_type === 'power').sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    const fixedFeeComponent = rates.find(c => c.item_type === 'fixed_fee');

    if (rates.length === 0) {
        return <div className="p-8 text-center text-gray-500 bg-slate-50 rounded-lg border border-dashed">No hay precios definidos para esta duración.</div>;
    }

    return (
        <>
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
                    Término de Potencia (€/kW/mes)
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
        </>
    );
}
