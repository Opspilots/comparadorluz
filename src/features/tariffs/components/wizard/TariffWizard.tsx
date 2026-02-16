import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import Step1Metadata from './Step1Metadata';
import { Step2ParserPreview } from './Step2ParserPreview';
import { Step3AEnergyPrices } from './Step3AEnergyPrices';
import { Step3BPowerPrices } from './Step3BPowerPrices';
import { Step4ScheduleRules } from './Step4ScheduleRules';
import { Step5FeesAndTaxes } from './Step5FeesAndTaxes';
import { Step6Summary } from './Step6Summary';
import { TariffWizardState, TariffStructure } from '@/types/tariff';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Step3BGasFixedFee } from './Step3BGasFixedFee';

const INITIAL_STATE: TariffWizardState = {
    metadata: {
        supplier_id: '',
        tariff_structure_id: '',
        name: '',
        code: '',
        is_indexed: false,
        valid_from: new Date().toISOString().split('T')[0],
    },
    rates: [],
    schedules: [],
    currentStep: 1,
    validationErrors: {},
};

export function TariffWizard({ initialSupplyType }: { initialSupplyType?: 'electricity' | 'gas' }) {
    const [state, setState] = useState<TariffWizardState>(INITIAL_STATE);
    const [structures, setStructures] = useState<TariffStructure[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const { toast } = useToast();

    const { id } = useParams();

    // Fetch structures and suppliers on mount
    useEffect(() => {
        Promise.all([
            supabase.from('tariff_structures').select('*'),
            supabase.from('suppliers').select('id, name').eq('is_active', true)
        ]).then(([structs, supps]) => {
            if (structs.data) setStructures(structs.data);
            if (supps.data) setSuppliers(supps.data);
        });
    }, []);

    // Load existing tariff if ID is present
    useEffect(() => {
        if (!id) return;

        const loadTariff = async () => {
            try {
                // Fetch version with related data
                const { data: version, error } = await supabase
                    .from('tariff_versions')
                    .select('*, tariff_rates(*), tariff_schedules(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (version) {
                    setState(prev => ({
                        ...prev,
                        metadata: {
                            supplier_id: version.supplier_id,
                            tariff_structure_id: version.tariff_structure_id,
                            name: version.tariff_name,
                            code: version.product_code || '',
                            is_indexed: version.is_indexed,
                            valid_from: version.valid_from,
                        },
                        rates: version.tariff_rates || [],
                        schedules: version.tariff_schedules || [],
                    }));
                }
            } catch (err) {
                console.error("Error loading tariff:", err);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la tarifa.' });
            }
        };
        loadTariff();
    }, [id]);

    const currentStructure = structures.find(s => s.id === state.metadata.tariff_structure_id);
    const isGas = currentStructure?.code?.startsWith('RL') || false;

    // Filter structures based on initialSupplyType (if provided, usually for new tariffs)
    const filteredStructures = structures.filter(s => {
        if (!initialSupplyType) return true;
        const isGasStructure = s.code?.startsWith('RL');
        return initialSupplyType === 'gas' ? isGasStructure : !isGasStructure;
    });

    const updateMetadata = (key: keyof TariffWizardState['metadata'], value: any) => {
        setState(prev => ({
            ...prev,
            metadata: { ...prev.metadata, [key]: value }
        }));
    };

    // Removed autoFillFromParsed as CNMC import is gone

    const updateRates = (newRates: any[]) => {
        setState(prev => ({ ...prev, rates: newRates }));
    };

    const nextStep = () => {
        // Validation before proceeding
        if (state.currentStep === 2) {
            if (!state.metadata.supplier_id || !state.metadata.name || !state.metadata.tariff_structure_id) {
                toast({
                    variant: 'destructive',
                    title: "Datos incompletos",
                    description: "Por favor completa los campos obligatorios."
                });
                return;
            }
        }


        let nextStep = state.currentStep + 1;
        // Skip Schedule Rules (Step 5) for Gas
        if (isGas && nextStep === 5) {
            nextStep = 6;
        }
        setState(prev => ({ ...prev, currentStep: nextStep }));
    };

    const prevStep = () => {
        let prevStep = state.currentStep - 1;
        // Skip Schedule Rules (Step 5) for Gas
        if (isGas && prevStep === 5) {
            prevStep = 4;
        }
        setState(prev => ({ ...prev, currentStep: Math.max(1, prevStep) }));
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>Asistente de Tarifa</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    <span>Paso {state.currentStep} de 7</span>
                    <span style={{ color: '#d1d5db' }}>|</span>
                    <span>{
                        state.currentStep === 1 ? 'Subir Factura' :
                            state.currentStep === 2 ? 'Configuración' :
                                state.currentStep === 3 ? (isGas ? 'Término Variable' : 'Energía') :
                                    state.currentStep === 4 ? (isGas ? 'Término Fijo' : 'Potencia') :
                                        state.currentStep === 5 ? 'Horarios' :
                                            state.currentStep === 6 ? 'Extras' : 'Resumen'
                    }</span>
                </div>
                {/* Progress Bar */}
                <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '0.625rem', marginTop: '1rem' }}>
                    <div style={{
                        background: '#2563eb',
                        height: '0.625rem',
                        borderRadius: '9999px',
                        transition: 'all 0.3s',
                        width: `${(state.currentStep / 7) * 100}%`
                    }}></div>
                </div>
            </div>

            <div className="card" style={{ padding: '2rem', minHeight: '400px', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                {state.currentStep === 1 && (
                    <Step2ParserPreview
                        data={state}
                        onDataExtracted={(extractedMetadata, extractedRates) => {
                            // Update Metadata
                            if (extractedMetadata.name) updateMetadata('name', extractedMetadata.name);
                            if (extractedMetadata.tariff_structure_id) {
                                const structId = extractedMetadata.tariff_structure_id;
                                const foundStruct = structures.find(s => s.code === structId || s.name.includes(structId));
                                if (foundStruct) updateMetadata('tariff_structure_id', foundStruct.id);
                            }
                            if (extractedMetadata.supplier_id) {
                                const supplierName = extractedMetadata.supplier_id;
                                const foundSupplier = suppliers.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
                                if (foundSupplier) updateMetadata('supplier_id', foundSupplier.id);
                            }

                            // Update Rates if found
                            if (extractedRates && extractedRates.length > 0) {
                                updateRates(extractedRates);
                            }

                            const msgDeps = [];
                            if (extractedMetadata.supplier_id) msgDeps.push('Comercializadora');
                            if (extractedMetadata.tariff_structure_id) msgDeps.push('Peaje');
                            if (extractedRates && extractedRates.length > 0) msgDeps.push('Precios');

                            toast({
                                title: "Datos Extraídos",
                                description: msgDeps.length > 0
                                    ? `Se han detectado: ${msgDeps.join(', ')}`
                                    : "No se detectaron datos automáticos. Por favor rellena los campos."
                            });
                        }}
                    />
                )}
                {state.currentStep === 2 && (
                    <Step1Metadata
                        data={state.metadata}
                        mode={id ? 'edit' : 'create'}
                        onChange={updateMetadata}
                        suppliers={suppliers}
                        structures={filteredStructures}
                    />
                )}
                {state.currentStep === 3 && (
                    <Step3AEnergyPrices
                        data={state}
                        structure={currentStructure}
                        onChange={updateRates}
                    />
                )}

                {state.currentStep === 4 && (
                    isGas ? (
                        <Step3BGasFixedFee
                            data={state}
                            structure={currentStructure}
                            onChange={updateRates}
                        />
                    ) : (
                        <Step3BPowerPrices
                            data={state}
                            structure={currentStructure}
                            onChange={updateRates}
                        />
                    )
                )}
                {state.currentStep === 5 && (
                    <Step4ScheduleRules
                        data={state}
                        onChange={(schedules) => setState(prev => ({ ...prev, schedules }))}
                    />
                )}
                {state.currentStep === 6 && (
                    <Step5FeesAndTaxes
                        data={state}
                        onChange={updateRates}
                    />
                )}
                {state.currentStep === 7 && (
                    <Step6Summary
                        data={state}
                        mode={id ? 'edit' : 'create'}
                        onSave={() => { }} // Handled internally in Step6 for now
                    />
                )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <button
                    onClick={prevStep}
                    disabled={state.currentStep === 1}
                    className="btn btn-secondary"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        opacity: state.currentStep === 1 ? 0.5 : 1,
                        cursor: state.currentStep === 1 ? 'not-allowed' : 'pointer'
                    }}
                >
                    <ChevronLeft size={16} /> Anterior
                </button>

                {state.currentStep < 7 && (
                    <button
                        onClick={nextStep}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        Siguiente <ChevronRight size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
