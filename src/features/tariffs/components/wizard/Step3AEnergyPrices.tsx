import { useEffect, useState, useMemo } from 'react';
import { TariffRate, TariffStructure, TariffWizardState } from '@/types/tariff';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Plus, Trash2, Clock } from 'lucide-react';
import { ValidityPriceGroup } from './ValidityPriceGroup';

interface Step3AProps {
    data: TariffWizardState;
    structure: TariffStructure | undefined;
    onChange: (rates: TariffRate[]) => void;
    onAddDuration: (months: number) => string | undefined;
    onAddValidityPeriod: (durationKey: string, validFrom: string) => void;
    onDeleteDuration: (durationKey: string) => void;
    onDeleteValidityGroup: (durationKey: string, validFrom: string | null, validTo: string | null) => void;
    onUpdateValidity: (durationKey: string, oldFrom: string | null, oldTo: string | null, newFrom: string | null, newTo: string | null) => void;
}

export function Step3AEnergyPrices({ data, structure, onChange, onAddDuration, onAddValidityPeriod, onDeleteDuration, onDeleteValidityGroup, onUpdateValidity }: Step3AProps) {
    const [activeTab, setActiveTab] = useState<string>("default");
    const [newDuration, setNewDuration] = useState<string>("12");

    const energyRates = useMemo(() => {
        return data.rates.filter(r => r.item_type === 'energy');
    }, [data.rates]);

    // Group by Duration
    const ratesByDuration = useMemo(() => {
        const grouped = new Map<string, TariffRate[]>();
        energyRates.forEach(r => {
            const key = r.contract_duration ? r.contract_duration.toString() : "any";
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(r);
        });
        return new Map([...grouped.entries()].sort((a, b) => {
            if (a[0] === 'any') return -1;
            if (b[0] === 'any') return 1;
            return parseInt(a[0]) - parseInt(b[0]);
        }));
    }, [energyRates]);

    useEffect(() => {
        const keys = Array.from(ratesByDuration.keys());
        if (keys.length > 0 && !ratesByDuration.has(activeTab) && activeTab !== 'default') {
            setActiveTab(keys[0]);
        } else if (keys.length > 0 && activeTab === 'default') {
            setActiveTab(keys[0]);
        }
    }, [ratesByDuration, activeTab]);

    const handleAddDuration = () => {
        const months = parseInt(newDuration);
        if (isNaN(months) || months <= 0) return;
        onAddDuration(months);
        setActiveTab(months.toString());
    };

    const handleAddValidityPeriod = (durationKey: string) => {
        const today = new Date().toISOString().split('T')[0];
        onAddValidityPeriod(durationKey, today);
    };

    const updateRate = <K extends keyof TariffRate>(id: string, field: K, value: TariffRate[K]) => {
        const newRates = data.rates.map(r => r.id === id ? { ...r, [field]: value } : r);
        onChange(newRates);
    };

    const updateValidity = (ids: string[], validFrom: string | null, validTo: string | null) => {
        // Find the duration key and old validity from the first rate in the group
        const firstRate = data.rates.find(r => ids.includes(r.id));
        if (!firstRate) return;
        const durationKey = firstRate.contract_duration ? firstRate.contract_duration.toString() : 'any';
        const oldFrom = firstRate.valid_from || null;
        const oldTo = firstRate.valid_to || null;
        onUpdateValidity(durationKey, oldFrom, oldTo, validFrom, validTo);
    };

    // Group by validity within a duration
    const getRatesByValidity = (rates: TariffRate[]) => {
        const grouped = new Map<string, TariffRate[]>();
        rates.forEach(r => {
            const key = JSON.stringify({ from: r.valid_from || null, to: r.valid_to || null });
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(r);
        });
        return Array.from(grouped.entries()).sort((a, b) => {
            const dateA = JSON.parse(a[0]).from || '1900-01-01';
            const dateB = JSON.parse(b[0]).from || '1900-01-01';
            return dateA.localeCompare(dateB);
        });
    };

    if (!structure) return <div>Selecciona una estructura en el paso 1.</div>;

    const durationKeys = Array.from(ratesByDuration.keys());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Precios de Energía</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    Las duraciones y periodos de vigencia se sincronizan con Precios de Potencia.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    <TabsList className="bg-slate-100 p-1 rounded-lg">
                        {durationKeys.map(key => (
                            <TabsTrigger key={key} value={key}
                                className="px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-medium">
                                {key === 'any' ? 'Estándar (Base)' : `${key} Meses`}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="flex items-center gap-2 ml-2">
                        <select
                            className="w-32 px-2 py-1 text-sm border rounded-md"
                            value={newDuration}
                            onChange={(e) => setNewDuration(e.target.value)}
                        >
                            <option value="12">12 Meses</option>
                            <option value="24">24 Meses</option>
                            <option value="36">36 Meses</option>
                        </select>
                        <button type="button" onClick={handleAddDuration}
                            className="p-2 text-primary hover:bg-slate-100 rounded-full transition-colors"
                            title="Añadir duración">
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {durationKeys.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '0.5rem' }}>
                        No hay precios configurados. Añade una duración.
                    </div>
                )}

                {durationKeys.map(key => {
                    const currentDurationRates = ratesByDuration.get(key) || [];
                    const validityGroups = getRatesByValidity(currentDurationRates);

                    return (
                        <TabsContent key={key} value={key} className="space-y-6 animate-in fade-in-50 duration-300">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock size={16} />
                                    <span>Configurando: <strong>{key === 'any' ? 'Cualquier duración' : `${key} meses`}</strong></span>
                                </div>
                                <button type="button"
                                    onClick={() => { if (confirm('¿Eliminar esta duración de energía Y potencia?')) onDeleteDuration(key); }}
                                    className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 px-2 py-1 bg-white border border-red-100 rounded hover:bg-red-50">
                                    <Trash2 size={12} /> Eliminar duración
                                </button>
                            </div>

                            {validityGroups.map(([validityKey, groupRates]) => (
                                <ValidityPriceGroup
                                    key={validityKey}
                                    rates={groupRates}
                                    onUpdateRate={(id, field, val) => updateRate(id, field, val)}
                                    onUpdateValidity={(f, t) => updateValidity(groupRates.map(r => r.id), f, t)}
                                    onDelete={() => {
                                        const parsed = JSON.parse(validityKey);
                                        onDeleteValidityGroup(key, parsed.from, parsed.to);
                                    }}
                                />
                            ))}

                            <button type="button" onClick={() => handleAddValidityPeriod(key)}
                                style={{
                                    width: '100%', padding: '1rem', border: '2px dashed #e2e8f0',
                                    borderRadius: '0.75rem', color: '#64748b', fontWeight: 500,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', background: 'none'
                                }}>
                                <Plus size={20} /> Añadir periodo de vigencia (crea energía + potencia)
                            </button>
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}
