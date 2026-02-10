import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
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

export function TariffWizard() {
    const [state, setState] = useState<TariffWizardState>(INITIAL_STATE);
    const [structures, setStructures] = useState<TariffStructure[]>([]);
    const { toast } = useToast();

    const { id } = useParams();

    // Fetch structures on mount
    useEffect(() => {
        supabase.from('tariff_structures').select('*')
            .then(({ data }) => {
                if (data) setStructures(data);
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

    const updateMetadata = (key: keyof TariffWizardState['metadata'], value: any) => {
        setState(prev => ({
            ...prev,
            metadata: { ...prev.metadata, [key]: value }
        }));
    };

    const updateRates = (newRates: any[]) => {
        setState(prev => ({ ...prev, rates: newRates }));
    };

    const nextStep = () => {
        // Basic validation before proceeding
        if (state.currentStep === 1) {
            if (!state.metadata.supplier_id || !state.metadata.name || !state.metadata.tariff_structure_id) {
                toast({
                    variant: 'destructive',
                    title: "Datos incompletos",
                    description: "Por favor completa los campos obligatorios."
                });
                return;
            }
        }
        setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    };

    const prevStep = () => {
        setState(prev => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1) }));
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Asistente de Tarifa</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span>Paso {state.currentStep} de 6</span>
                    <span className="text-gray-300">|</span>
                    <span>{
                        state.currentStep === 1 ? 'Configuración' :
                            state.currentStep === 2 ? 'Importación' :
                                state.currentStep === 3 ? 'Energía' :
                                    state.currentStep === 4 ? 'Potencia' : // Step 3B is logically step 4 in UI flow if we split it? 
                                        // Wait, user plan said:
                                        // Step 3A: Energy
                                        // Step 3B: Power
                                        // Step 4: Schedules
                                        // So my currentStep might need adjustment if I treat 3A and 3B as separate screens.
                                        // I will map currentStep 1..6 to the components.
                                        // 1: Metadata
                                        // 2: Preview
                                        // 3: Energy
                                        // 4: Power  <-- This is where I shift index
                                        // 5: Schedules
                                        // 6: Fees
                                        // 7: Summary <-- Total 7 steps?
                                        // User plan said: "Paso 3A", "Paso 3B". 
                                        // I'll make it 7 steps internally for simplicity or Keep 3 as a tabbed step?
                                        // "Paso 3A" and "Paso 3B" implies a split. I'll increase total steps to 7.
                                        state.currentStep === 5 ? 'Horarios' :
                                            state.currentStep === 6 ? 'Extras' : 'Resumen'
                    }</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(state.currentStep / 7) * 100}%` }}></div>
                </div>
            </div>

            <Card className="p-6 min-h-[400px]">
                {state.currentStep === 1 && (
                    <Step1Metadata
                        data={state.metadata}
                        mode={id ? 'edit' : 'create'}
                        onChange={updateMetadata}
                    />
                )}
                {state.currentStep === 2 && (
                    <Step2ParserPreview
                        data={state}
                        onDataExtracted={(extracted) => updateMetadata('name', extracted.name || state.metadata.name)}
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
                    <Step3BPowerPrices
                        data={state}
                        structure={currentStructure}
                        onChange={updateRates}
                    />
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
            </Card>

            <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={prevStep} disabled={state.currentStep === 1}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>

                {state.currentStep < 7 && (
                    <Button onClick={nextStep}>
                        Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
