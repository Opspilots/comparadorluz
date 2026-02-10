import { useEffect, useState } from 'react';
import { TariffRate, TariffStructure, TariffWizardState } from '@/types/tariff';
import { Card } from '@/shared/components/ui/card';

interface Step3AProps {
    data: TariffWizardState;
    structure: TariffStructure | undefined;
    onChange: (rates: TariffRate[]) => void;
}

export function Step3AEnergyPrices({ data, structure, onChange }: Step3AProps) {
    const [localRates, setLocalRates] = useState<TariffRate[]>([]);

    useEffect(() => {
        if (!structure) return;

        // Initialize rates if not present
        const existingEnergyRates = data.rates.filter(r => r.item_type === 'energy');

        if (existingEnergyRates.length === 0) {
            const newRates: TariffRate[] = [];
            for (let i = 1; i <= structure.energy_periods; i++) {
                newRates.push({
                    id: crypto.randomUUID(),
                    tariff_version_id: '', // Set on save
                    item_type: 'energy',
                    period: `P${i}`,
                    price: null,
                    price_formula: '',
                    unit: 'EUR/kWh',
                    confidence_score: 1.0 // Default for manual
                });
            }
            setLocalRates(newRates);
            // Notify parent? Or wait for edits?
            // onChange([...data.rates.filter(r => r.item_type !== 'energy'), ...newRates]);
        } else {
            setLocalRates(existingEnergyRates);
        }
    }, [structure, data.rates]);

    const updateRate = (index: number, field: keyof TariffRate, value: any) => {
        const updated = [...localRates];
        updated[index] = { ...updated[index], [field]: value };
        setLocalRates(updated);

        // Update parent state
        const otherRates = data.rates.filter(r => r.item_type !== 'energy');
        onChange([...otherRates, ...updated]);
    };

    if (!structure) return <div>Selecciona una estructura en el paso 1.</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Precios de Energía (Término Variable)</h2>
            <p className="text-gray-500 text-sm">Validación de precios por periodo.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localRates.map((rate, idx) => (
                    <Card key={rate.period} className="p-4 border-l-4 border-l-blue-500">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg">{rate.period}</h3>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Energía</span>
                        </div>

                        {data.metadata.is_indexed ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Fórmula Indexada</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm border-gray-300 rounded focus:ring-blue-500"
                                        placeholder="Ej: OMIE + 0.01"
                                        value={rate.price_formula || ''}
                                        onChange={(e) => updateRate(idx, 'price_formula', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Precio Simulado (€/kWh)</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        className="w-full text-sm border-gray-300 rounded focus:ring-blue-500"
                                        value={rate.price || ''}
                                        onChange={(e) => updateRate(idx, 'price', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Precio Fijo (€/kWh)</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    className="w-full text-lg font-mono border-gray-300 rounded focus:ring-blue-500"
                                    value={rate.price || ''}
                                    onChange={(e) => updateRate(idx, 'price', parseFloat(e.target.value))}
                                />
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
