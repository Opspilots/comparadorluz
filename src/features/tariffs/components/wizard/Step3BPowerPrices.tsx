import { useEffect, useState } from 'react';
import { TariffRate, TariffStructure, TariffWizardState } from '@/types/tariff';
import { Card } from '@/shared/components/ui/card';

interface Step3BProps {
    data: TariffWizardState;
    structure: TariffStructure | undefined;
    onChange: (rates: TariffRate[]) => void;
}

export function Step3BPowerPrices({ data, structure, onChange }: Step3BProps) {
    const [localRates, setLocalRates] = useState<TariffRate[]>([]);

    useEffect(() => {
        if (!structure) return;

        const existingPowerRates = data.rates.filter(r => r.item_type === 'power');

        if (existingPowerRates.length === 0) {
            const newRates: TariffRate[] = [];
            for (let i = 1; i <= structure.power_periods; i++) {
                newRates.push({
                    id: crypto.randomUUID(),
                    tariff_version_id: '',
                    item_type: 'power',
                    period: `P${i}`,
                    price: null,
                    unit: 'EUR/kW/year', // Default unit
                    confidence_score: 1.0
                });
            }
            setLocalRates(newRates);
        } else {
            setLocalRates(existingPowerRates);
        }
    }, [structure, data.rates]);

    const updateRate = (index: number, field: keyof TariffRate, value: any) => {
        const updated = [...localRates];
        updated[index] = { ...updated[index], [field]: value };
        setLocalRates(updated);

        const otherRates = data.rates.filter(r => r.item_type !== 'power');
        onChange([...otherRates, ...updated]);
    };

    if (!structure) return <div>Selecciona una estructura en el paso 1.</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Precios de Potencia (Término Fijo)</h2>
            <p className="text-gray-500 text-sm">Validación de precios por potencia contratada.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localRates.map((rate, idx) => (
                    <Card key={rate.period} className="p-4 border-l-4 border-l-green-500">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg">{rate.period}</h3>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Potencia</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Precio</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full text-lg font-mono border-gray-300 rounded focus:ring-blue-500"
                                    value={rate.price || ''}
                                    onChange={(e) => updateRate(idx, 'price', parseFloat(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Unidad</label>
                                <select
                                    className="w-full text-sm border-gray-300 rounded focus:ring-blue-500"
                                    value={rate.unit}
                                    onChange={(e) => updateRate(idx, 'unit', e.target.value)}
                                >
                                    <option value="EUR/kW/year">€/kW/año</option>
                                    <option value="EUR/kW/day">€/kW/día</option>
                                    <option value="EUR/kW/month">€/kW/mes</option>
                                </select>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
