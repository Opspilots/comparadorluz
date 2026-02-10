import { useState } from 'react';
import { TariffRate, TariffWizardState } from '@/types/tariff';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

interface Step5Props {
    data: TariffWizardState;
    onChange: (rates: TariffRate[]) => void;
}

export function Step5FeesAndTaxes({ data, onChange }: Step5Props) {
    const feesAndTaxes = data.rates.filter(r => ['fixed_fee', 'tax', 'discount'].includes(r.item_type));

    const addRate = (type: 'fixed_fee' | 'tax' | 'discount') => {
        const newRate: TariffRate = {
            id: crypto.randomUUID(),
            tariff_version_id: '',
            item_type: type,
            price: 0,
            unit: type === 'fixed_fee' ? 'EUR/month' : '%',
        };
        onChange([...data.rates, newRate]);
    };

    const removeRate = (id: string) => {
        onChange(data.rates.filter(r => r.id !== id));
    };

    const updateRate = (id: string, field: keyof TariffRate, value: any) => {
        const updatedRates = data.rates.map(r => r.id === id ? { ...r, [field]: value } : r);
        onChange(updatedRates);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Cargos Extra e Impuestos</h2>

            <div className="space-y-4">
                {feesAndTaxes.map((rate) => (
                    <Card key={rate.id} className="p-4 flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700">Tipo</label>
                            <select
                                className="w-full text-sm border-gray-300 rounded"
                                value={rate.item_type}
                                onChange={(e) => updateRate(rate.id, 'item_type', e.target.value)}
                            >
                                <option value="fixed_fee">Cuota Fija</option>
                                <option value="tax">Impuesto</option>
                                <option value="discount">Descuento</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700">Valor</label>
                            <input
                                type="number"
                                className="w-full text-sm border-gray-300 rounded"
                                value={rate.price || ''}
                                onChange={(e) => updateRate(rate.id, 'price', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-medium text-gray-700">Unidad</label>
                            <select
                                className="w-full text-sm border-gray-300 rounded"
                                value={rate.unit}
                                onChange={(e) => updateRate(rate.id, 'unit', e.target.value)}
                            >
                                <option value="EUR/month">€/mes</option>
                                <option value="EUR/day">€/día</option>
                                <option value="%">%</option>
                            </select>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeRate(rate.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </Card>
                ))}

                {feesAndTaxes.length === 0 && (
                    <p className="text-gray-500 text-sm italic">No hay cargos extra configurados.</p>
                )}
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={() => addRate('fixed_fee')} className="gap-2">
                    <Plus className="h-4 w-4" /> Añadir Cuota
                </Button>
                <Button variant="outline" onClick={() => addRate('tax')} className="gap-2">
                    <Plus className="h-4 w-4" /> Añadir Impuesto
                </Button>
            </div>
        </div>
    );
}
