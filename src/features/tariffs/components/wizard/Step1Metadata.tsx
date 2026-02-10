import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { TariffStructure } from '@/types/tariff';

interface Step1Props {
    data: {
        supplier_id: string;
        tariff_structure_id: string;
        name: string;
        code: string;
        is_indexed: boolean;
        valid_from: string;
    };
    mode?: 'create' | 'edit';
    onChange: (key: keyof Step1Props['data'], value: any) => void;
}

export default function Step1Metadata({ data, mode = 'create', onChange }: Step1Props) {
    const [structures, setStructures] = useState<TariffStructure[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: structs } = await supabase.from('tariff_structures').select('*');
            const { data: supps } = await supabase.from('suppliers').select('id, name').eq('is_active', true);

            if (structs) setStructures(structs);
            if (supps) setSuppliers(supps);
        };
        fetchData();
    }, []);

    const isEdit = mode === 'edit';

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Configuración Básica</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comercializadora</label>
                    <select
                        className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        value={data.supplier_id}
                        onChange={(e) => onChange('supplier_id', e.target.value)}
                        disabled={isEdit}
                    >
                        <option value="">Seleccionar...</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Tarifa</label>
                    <input
                        type="text"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={data.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        placeholder="Ej: Plan Estable 24h"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estructura Tarifaria</label>
                    <select
                        className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${isEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        value={data.tariff_structure_id}
                        onChange={(e) => onChange('tariff_structure_id', e.target.value)}
                        disabled={isEdit}
                    >
                        <option value="">Seleccionar Estructura...</option>
                        {structures.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Define los periodos de energía y potencia.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Precio</label>
                    <div className="flex gap-4 mt-2">
                        <label className={`inline-flex items-center ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input
                                type="radio"
                                className="form-radio text-blue-600"
                                name="is_indexed"
                                checked={!data.is_indexed}
                                onChange={() => !isEdit && onChange('is_indexed', false)}
                                disabled={isEdit}
                            />
                            <span className="ml-2">Fijo</span>
                        </label>
                        <label className={`inline-flex items-center ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input
                                type="radio"
                                className="form-radio text-blue-600"
                                name="is_indexed"
                                checked={data.is_indexed}
                                onChange={() => !isEdit && onChange('is_indexed', true)}
                                disabled={isEdit}
                            />
                            <span className="ml-2">Indexado (OMIE)</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Válida Desde</label>
                    <input
                        type="date"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={data.valid_from}
                        onChange={(e) => onChange('valid_from', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código Oferta (Opcional)</label>
                    <input
                        type="text"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={data.code}
                        onChange={(e) => onChange('code', e.target.value)}
                        placeholder="Ref. Interna"
                    />
                </div>
            </div>
        </div>
    );
}
