import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { Step1Upload } from './Step1Upload';
import { Step2Candidates } from './Step2Candidates';
import Step1Metadata from './Step1Metadata';
import { Step3AEnergyPrices } from './Step3AEnergyPrices';
import { Step3BPowerPrices } from './Step3BPowerPrices';
import { Step4ScheduleRules } from './Step4ScheduleRules';
import { Step5FeesAndTaxes } from './Step5FeesAndTaxes';
import { Step6Summary } from './Step6Summary';
import { TariffWizardState, TariffStructure, DetectedTariff, TariffRate, TariffRateType, Supplier } from '@/shared/types';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, ListChecks, Building2, X } from 'lucide-react';
import { Step3BGasFixedFee } from './Step3BGasFixedFee';

const INITIAL_STATE: TariffWizardState = {
    metadata: {
        supplier_id: '',
        tariff_structure_id: '',
        name: '',
        code: '',
        is_indexed: false,
        valid_from: new Date().toISOString().split('T')[0],
        contract_duration: null,
        commission_type: 'percentage',
        commission_value: 0,
    },
    rates: [],
    schedules: [],
    currentStep: 1,
    validationErrors: {},
};

export function TariffWizard({ initialSupplyType }: { initialSupplyType?: 'electricity' | 'gas' }) {
    const { id } = useParams();

    const [candidates, setCandidates] = useState<DetectedTariff[]>(() => {
        if (!id) {
            const savedCandidates = sessionStorage.getItem('tariffWizardCandidates');
            if (savedCandidates) {
                try {
                    return JSON.parse(savedCandidates);
                } catch (e) {
                    console.error("Failed to parse saved candidates", e);
                }
            }
        }
        return [];
    });

    const [state, setState] = useState<TariffWizardState>(() => {
        if (!id) {
            const savedItem = sessionStorage.getItem('tariffWizardState');
            if (savedItem) {
                try {
                    const parsed = JSON.parse(savedItem);
                    // If there are pending candidates, always return to the candidates list
                    const savedCandidates = sessionStorage.getItem('tariffWizardCandidates');
                    if (savedCandidates) {
                        const parsedCandidates = JSON.parse(savedCandidates);
                        if (Array.isArray(parsedCandidates) && parsedCandidates.length > 0) {
                            return { ...parsed, currentStep: 2 };
                        }
                    }
                    return parsed;
                } catch (e) {
                    console.error("Failed to parse saved state", e);
                }
            }
        }
        return INITIAL_STATE;
    });

    const [structures, setStructures] = useState<TariffStructure[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [unknownSupplier, setUnknownSupplier] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const { toast } = useToast();
    const navigate = useNavigate();

    // Fetch current user's company_id
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase.from('users').select('company_id').eq('id', user.id).maybeSingle().then(({ data: profile }) => {
                if (profile?.company_id) setCompanyId(profile.company_id);
            });
        });
    }, []);

    // Fetch structures and suppliers on mount
    useEffect(() => {
        if (!companyId) return;
        Promise.all([
            supabase.from('tariff_structures').select('*'),
            supabase.from('suppliers').select('id, name, is_active').eq('is_active', true).or(`company_id.eq.${companyId},is_global.eq.true`)
        ]).then(([structs, supps]) => {
            if (structs.data) setStructures(structs.data);
            if (supps.data) setSuppliers(supps.data as Supplier[]);
        });
    }, [companyId]);

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
                        currentStep: 3, // Start at Metadata for editing
                        metadata: {
                            supplier_id: version.supplier_id,
                            tariff_structure_id: version.tariff_structure_id,
                            name: version.tariff_name,
                            code: version.product_code || '',
                            is_indexed: version.is_indexed,
                            valid_from: version.valid_from,
                            contract_duration: version.contract_duration || null,
                            commission_type: version.commission_type || 'percentage',
                            commission_value: version.commission_value ?? 0,
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
    }, [id, toast]);

    // Persist to session storage
    useEffect(() => {
        if (!id) {
            sessionStorage.setItem('tariffWizardState', JSON.stringify(state));
        }
    }, [state, id]);

    useEffect(() => {
        if (!id) {
            sessionStorage.setItem('tariffWizardCandidates', JSON.stringify(candidates));
        }
    }, [candidates, id]);

    const currentStructure = structures.find(s => s.id === state.metadata.tariff_structure_id);
    const isGas = currentStructure?.code?.startsWith('RL') || false;

    // Filter structures: if a structure is already selected, derive the supply type from it;
    // otherwise fall back to initialSupplyType. This ensures that when editing a gas OCR
    // candidate from an electricity wizard context, the gas structures are correctly shown.
    const effectiveSupplyType = currentStructure
        ? (currentStructure.code?.startsWith('RL') ? 'gas' : 'electricity')
        : initialSupplyType;
    const filteredStructures = structures.filter(s => {
        if (!effectiveSupplyType) return true;
        const isGasStructure = s.code?.startsWith('RL');
        return effectiveSupplyType === 'gas' ? isGasStructure : !isGasStructure;
    });

    const updateMetadata = <K extends keyof TariffWizardState['metadata']>(key: K, value: TariffWizardState['metadata'][K]) => {
        if (key === 'supplier_id' && value) setUnknownSupplier(null);
        setState(prev => ({
            ...prev,
            metadata: { ...prev.metadata, [key]: value }
        }));
    };

    const updateRates = (newRates: TariffRate[]) => {
        setState(prev => ({ ...prev, rates: newRates }));
    };

    // Initialize base rates when structure is selected and no rates exist
    useEffect(() => {
        if (!currentStructure) return;
        const hasEnergy = state.rates.some(r => r.item_type === 'energy');
        const hasPower = state.rates.some(r => r.item_type === 'power');
        if (!hasEnergy && !hasPower) {
            const initialDuration = state.metadata.contract_duration;
            const newRates: TariffRate[] = [];
            for (let i = 1; i <= currentStructure.energy_periods; i++) {
                newRates.push({ id: crypto.randomUUID(), tariff_version_id: '', item_type: 'energy', period: `P${i}`, price: null, price_formula: '', unit: 'EUR/kWh', confidence_score: 1.0, contract_duration: initialDuration });
            }
            for (let i = 1; i <= currentStructure.power_periods; i++) {
                newRates.push({ id: crypto.randomUUID(), tariff_version_id: '', item_type: 'power', period: `P${i}`, price: null, unit: 'EUR/kW/month', confidence_score: 1.0, contract_duration: initialDuration });
            }
            setState(prev => ({ ...prev, rates: [...prev.rates, ...newRates] }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStructure?.id]);

    // Shared handlers so Energy and Power steps always stay in sync
    const handleAddDuration = (months: number) => {
        if (!currentStructure) return;
        const key = months.toString();
        const existing = state.rates.filter(r => r.item_type === 'energy' && r.contract_duration === months);
        if (existing.length > 0) return; // already exists

        const newRates: TariffRate[] = [];
        for (let i = 1; i <= currentStructure.energy_periods; i++) {
            newRates.push({ id: crypto.randomUUID(), tariff_version_id: '', item_type: 'energy', period: `P${i}`, price: null, price_formula: '', unit: 'EUR/kWh', confidence_score: 1.0, contract_duration: months });
        }
        for (let i = 1; i <= currentStructure.power_periods; i++) {
            newRates.push({ id: crypto.randomUUID(), tariff_version_id: '', item_type: 'power', period: `P${i}`, price: null, unit: 'EUR/kW/month', confidence_score: 1.0, contract_duration: months });
        }
        setState(prev => ({ ...prev, rates: [...prev.rates, ...newRates] }));
        return key;
    };

    const handleAddValidityPeriod = (durationKey: string, validFrom: string) => {
        if (!currentStructure) return;
        const duration = durationKey === 'any' ? null : parseInt(durationKey);
        const newRates: TariffRate[] = [];
        for (let i = 1; i <= currentStructure.energy_periods; i++) {
            newRates.push({ id: crypto.randomUUID(), tariff_version_id: '', item_type: 'energy', period: `P${i}`, price: null, price_formula: '', unit: 'EUR/kWh', confidence_score: 1.0, contract_duration: duration, valid_from: validFrom });
        }
        for (let i = 1; i <= currentStructure.power_periods; i++) {
            newRates.push({ id: crypto.randomUUID(), tariff_version_id: '', item_type: 'power', period: `P${i}`, price: null, unit: 'EUR/kW/month', confidence_score: 1.0, contract_duration: duration, valid_from: validFrom });
        }
        setState(prev => ({ ...prev, rates: [...prev.rates, ...newRates] }));
    };

    const handleDeleteDuration = (durationKey: string) => {
        const duration = durationKey === 'any' ? null : parseInt(durationKey);
        setState(prev => ({
            ...prev,
            rates: prev.rates.filter(r => {
                if (r.item_type !== 'energy' && r.item_type !== 'power') return true;
                if (duration === null) return r.contract_duration !== null;
                return r.contract_duration !== duration;
            })
        }));
    };

    const handleDeleteValidityGroup = (durationKey: string, validFrom: string | null, validTo: string | null) => {
        const duration = durationKey === 'any' ? null : parseInt(durationKey);
        setState(prev => ({
            ...prev,
            rates: prev.rates.filter(r => {
                if (r.item_type !== 'energy' && r.item_type !== 'power') return true;
                const matchesDuration = duration === null ? r.contract_duration === null : r.contract_duration === duration;
                const matchesValidity = (r.valid_from || null) === validFrom && (r.valid_to || null) === validTo;
                return !(matchesDuration && matchesValidity);
            })
        }));
    };

    const handleUpdateValidity = (durationKey: string, oldValidFrom: string | null, oldValidTo: string | null, newValidFrom: string | null, newValidTo: string | null) => {
        const duration = durationKey === 'any' ? null : parseInt(durationKey);
        setState(prev => ({
            ...prev,
            rates: prev.rates.map(r => {
                if (r.item_type !== 'energy' && r.item_type !== 'power') return r;
                const matchesDuration = duration === null ? r.contract_duration === null : r.contract_duration === duration;
                const matchesValidity = (r.valid_from || null) === oldValidFrom && (r.valid_to || null) === oldValidTo;
                if (matchesDuration && matchesValidity) {
                    return { ...r, valid_from: newValidFrom || undefined, valid_to: newValidTo || undefined };
                }
                return r;
            })
        }));
    };

    // Transition Logic
    const goToStep = (step: number) => {
        setState(prev => ({ ...prev, currentStep: step }));
    };

    const nextStep = () => {
        // Validation handled inside steps mostly, or check basic needs here
        if (state.currentStep === 3) {
            if (!state.metadata.supplier_id || !state.metadata.name || !state.metadata.tariff_structure_id) {
                toast({
                    variant: 'destructive',
                    title: "Datos incompletos",
                    description: "Por favor completa los campos obligatorios."
                });
                return;
            }
        }

        let next = state.currentStep + 1;
        // Skip Schedule Rules (Step 6) for Gas
        if (isGas && next === 6) {
            next = 7;
        }
        goToStep(next);
    };

    const prevStep = () => {
        let prev = state.currentStep - 1;
        // Skip Schedule Rules (Step 6) for Gas
        if (isGas && prev === 6) {
            prev = 5;
        }
        // If going back from Step 3 (Metadata), where do we go?
        // If we came from Candidates (Step 2), go there.
        // If we are editing (ID exists), maybe go nowhere or back to list?
        if (prev === 2 && id) {
            // If editing existing, maybe back to dashboard?
            navigate(-1);
            return;
        }

        goToStep(Math.max(1, prev));
    };

    // Handlers for Step 1 & 2
    const handleTariffsDetected = (newCandidates: DetectedTariff[], _file: File) => {
        setCandidates(prev => {
            const combined = [...prev, ...newCandidates];

            // Aggregation logic: merge tariffs with same supplier, structure, and supply type
            const aggregated: DetectedTariff[] = [];

            combined.forEach(candidate => {
                const isMatch = (a: DetectedTariff) =>
                    a.tariff_structure === candidate.tariff_structure &&
                    a.supply_type === candidate.supply_type &&
                    (a.supplier_name || '').toLowerCase() === (candidate.supplier_name || '').toLowerCase() &&
                    (a.tariff_name || '').toLowerCase() === (candidate.tariff_name || '').toLowerCase();

                const matchIndex = aggregated.findIndex(isMatch);

                if (matchIndex !== -1) {
                    const existing = aggregated[matchIndex];

                    // Normalize existing price_sets to ensure they retain their duration and validity
                    let existingSets = existing.price_sets || [];
                    if (existingSets.length === 0) {
                        existingSets = [{
                            contract_duration: existing.contract_duration ? parseInt(String(existing.contract_duration), 10) : null,
                            valid_from: undefined,
                            valid_to: undefined,
                            energy_prices: existing.energy_prices || [],
                            power_prices: existing.power_prices || [],
                            fixed_term_prices: existing.fixed_term_prices || []
                        }];
                    } else {
                        // Inject root duration if missing
                        existingSets = existingSets.map(set => ({
                            ...set,
                            contract_duration: set.contract_duration ?? (existing.contract_duration ? parseInt(String(existing.contract_duration), 10) : null)
                        }));
                    }

                    // Normalize new price_sets
                    let newSets = candidate.price_sets || [];
                    if (newSets.length === 0) {
                        newSets = [{
                            contract_duration: candidate.contract_duration ? parseInt(String(candidate.contract_duration), 10) : null,
                            valid_from: undefined,
                            valid_to: undefined,
                            energy_prices: candidate.energy_prices || [],
                            power_prices: candidate.power_prices || [],
                            fixed_term_prices: candidate.fixed_term_prices || []
                        }];
                    } else {
                        // Inject root duration if missing
                        newSets = newSets.map(set => ({
                            ...set,
                            contract_duration: set.contract_duration ?? (candidate.contract_duration ? parseInt(String(candidate.contract_duration), 10) : null)
                        }));
                    }

                    existing.price_sets = [...existingSets, ...newSets];
                } else {
                    // Normalize candidate if it doesn't have price_sets
                    if (!candidate.price_sets || candidate.price_sets.length === 0) {
                        candidate.price_sets = [{
                            contract_duration: candidate.contract_duration ? parseInt(String(candidate.contract_duration), 10) : null,
                            valid_from: undefined,
                            valid_to: undefined,
                            energy_prices: candidate.energy_prices || [],
                            power_prices: candidate.power_prices || [],
                            fixed_term_prices: candidate.fixed_term_prices || []
                        }];
                    } else {
                        candidate.price_sets = candidate.price_sets.map(set => ({
                            ...set,
                            contract_duration: set.contract_duration ?? (candidate.contract_duration ? parseInt(String(candidate.contract_duration), 10) : null)
                        }));
                    }
                    aggregated.push(candidate);
                }
            });

            return aggregated;
        });
        goToStep(2); // Go to Results Table
    };

    const handleEditCandidate = (candidate: DetectedTariff) => {
        // Map candidate to state
        // Populate metadata
        const metadataUpdates: Partial<TariffWizardState['metadata']> = {};
        if (candidate.tariff_name) metadataUpdates.name = candidate.tariff_name;
        if (candidate.is_indexed !== undefined) metadataUpdates.is_indexed = candidate.is_indexed;

        // Parse contract_duration (already numeric from Step1Upload, but IA might return string)
        const parsedDuration = candidate.contract_duration ? parseInt(String(candidate.contract_duration), 10) : null;
        metadataUpdates.contract_duration = parsedDuration;

        // Map validity_date from first price_set to metadata.valid_from
        let firstValidity: string | undefined = undefined;
        if (candidate.price_sets && candidate.price_sets.length > 0) {
            firstValidity = candidate.price_sets.find(s => s.valid_from)?.valid_from;
        }
        if (firstValidity) {
            metadataUpdates.valid_from = firstValidity;
        }

        // Resolve structure ID, filtering by supply_type if present
        if (candidate.tariff_structure) {
            let matchStructures = structures;
            if (candidate.supply_type) {
                matchStructures = structures.filter(s => {
                    const isGasStruct = s.code?.startsWith('RL');
                    return candidate.supply_type === 'gas' ? isGasStruct : !isGasStruct;
                });
            }
            const s = matchStructures.find(s => s.code === candidate.tariff_structure || s.name.includes(candidate.tariff_structure!));
            if (s) metadataUpdates.tariff_structure_id = s.id;
        }
        if (candidate.supplier_name) {
            // Normalize: lowercase + remove accents/diacritics for fuzzy matching
            const norm = (str: string) =>
                str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const normCandidate = norm(candidate.supplier_name);
            const s = suppliers.find(s => {
                const normSupplier = norm(s.name);
                // Match if either string is a substring of the other (handles OCR extra words)
                return normSupplier.includes(normCandidate) || normCandidate.includes(normSupplier);
            });
            if (s) {
                metadataUpdates.supplier_id = s.id;
                setUnknownSupplier(null);
            } else {
                setUnknownSupplier(candidate.supplier_name);
            }
        }

        // Build rates from price_sets (each set has its own valid_from/valid_to)
        const newRates: TariffWizardState['rates'] = [];
        const createRate = (
            item: { period?: string, price: number, unit?: string },
            type: TariffRateType,
            set: { valid_from?: string; valid_to?: string; contract_duration?: number | null; }
        ): TariffRate => ({
            id: crypto.randomUUID(),
            tariff_version_id: '',
            item_type: type,
            period: item.period || (type === 'fixed_fee' ? 'P1' : undefined),
            price: item.price,
            unit: item.unit || (type === 'energy' ? 'EUR/kWh' : type === 'power' ? 'EUR/kW/month' : 'EUR/month'),
            contract_duration: set.contract_duration != null ? parseInt(String(set.contract_duration), 10) : parsedDuration, // Fallback to candidate global duration
            valid_from: set.valid_from || undefined, // DO NOT fallback to metadata — only use explicit validity from the price_set
            valid_to: set.valid_to || undefined,
        });

        const sets = candidate.price_sets && candidate.price_sets.length > 0
            ? candidate.price_sets
            : [{ energy_prices: candidate.energy_prices, power_prices: candidate.power_prices, fixed_term_prices: candidate.fixed_term_prices }];

        sets.forEach(set => {
            (set.energy_prices || []).forEach(p => newRates.push(createRate(p, 'energy', set)));
            (set.power_prices || []).forEach(p => newRates.push(createRate(p, 'power', set)));
            (set.fixed_term_prices || []).forEach(p => newRates.push(createRate(p, 'fixed_fee', set)));
        });

        setState(prev => ({
            ...prev,
            currentStep: 3, // Go to Metadata
            metadata: { ...prev.metadata, ...metadataUpdates },
            rates: newRates
        }));
    };

    const handleManualEntry = () => {
        // Reset state?
        // Go to Step 3 directly with empty state
        goToStep(3);
    };

    const handleFinish = () => {
        // Clear session storage on success
        if (!id) {
            sessionStorage.removeItem('tariffWizardState');
            sessionStorage.removeItem('tariffWizardCandidates');
        }

        if (candidates.length > 0) {
            goToStep(2);
        } else {
            // Default behavior (navigate away)
            navigate('/admin/tariffs');
        }
    };

    const handleDiscard = () => {
        if (confirm("¿Estás seguro de que quieres descartar el progreso? Se perderán todos los datos escaneados no guardados.")) {
            sessionStorage.removeItem('tariffWizardState');
            sessionStorage.removeItem('tariffWizardCandidates');
            setState(INITIAL_STATE);
            setCandidates([]);
        }
    };


    const getStepLabel = (step: number) => {
        switch (step) {
            case 1: return 'Carga';
            case 2: return 'Resultados';
            case 3: return 'Datos Básicos';
            case 4: return isGas ? 'Término Variable' : 'Energía';
            case 5: return isGas ? 'Término Fijo' : 'Potencia';
            case 6: return 'Horarios'; // Skipped for Gas
            case 7: return 'Extras';
            case 8: return 'Resumen';
            default: return '';
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>Asistente de Tarifa</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            <span>Paso {state.currentStep} de 8</span>
                            <span style={{ color: '#d1d5db' }}>|</span>
                            <span>{getStepLabel(state.currentStep)}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {!id && candidates.length > 0 && state.currentStep > 2 && (
                            <button
                                onClick={() => goToStep(2)}
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
                            >
                                <ListChecks size={14} /> Volver a tarifas OCR
                            </button>
                        )}
                        {!id && (state.currentStep > 1 || candidates.length > 0) && (
                            <button
                                onClick={handleDiscard}
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#ef4444', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                            >
                                Descartar Borrador
                            </button>
                        )}
                    </div>
                </div>
                {/* Progress Bar */}
                <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '0.625rem', marginTop: '1rem' }}>
                    <div style={{
                        background: '#2563eb',
                        height: '0.625rem',
                        borderRadius: '9999px',
                        transition: 'all 0.3s',
                        width: `${(state.currentStep / 8) * 100}%`
                    }}></div>
                </div>
            </div>

            {/* Unknown supplier warning banner */}
            {unknownSupplier && state.currentStep >= 3 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.5rem',
                    padding: '0.75rem 1rem', marginBottom: '1rem', gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#92400e' }}>
                        <Building2 size={16} />
                        <span>
                            La comercializadora <strong>"{unknownSupplier}"</strong> no está registrada.
                            Regístrala antes de guardar la tarifa o selecciona una manualmente.
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                            onClick={async () => {
                                try {
                                    const slug = unknownSupplier.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                    const { data: newSupplier, error } = await supabase
                                        .from('suppliers')
                                        .insert({
                                            name: unknownSupplier,
                                            slug: slug,
                                            is_active: true
                                        })
                                        .select()
                                        .single();

                                    if (error) throw error;

                                    setSuppliers(prev => [...prev, newSupplier as Supplier]);
                                    updateMetadata('supplier_id', newSupplier.id);
                                    setUnknownSupplier(null);
                                    toast({ title: 'Comercializadora creada', description: `Se ha registrado "${unknownSupplier}" correctamente.` });
                                } catch (err: unknown) {
                                    toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido' });
                                }
                            }}
                            style={{
                                fontSize: '0.8rem', fontWeight: 600, padding: '0.375rem 0.75rem',
                                background: '#f59e0b', color: 'white', border: 'none',
                                borderRadius: '0.375rem', cursor: 'pointer'
                            }}
                        >
                            + Registrar comercializadora
                        </button>
                        <button
                            onClick={() => setUnknownSupplier(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: '2rem', minHeight: '400px', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                {state.currentStep === 1 && (
                    <Step1Upload
                        onTariffsDetected={handleTariffsDetected}
                        onManualEntry={handleManualEntry}
                    />
                )}
                {state.currentStep === 2 && (
                    <Step2Candidates
                        candidates={candidates}
                        onAddDocument={() => goToStep(1)}
                        onEdit={handleEditCandidate}
                        onRemove={(id) => setCandidates(prev => prev.filter(c => c.id !== id))}
                        onUpdateCandidates={setCandidates}
                    />
                )}
                {state.currentStep === 3 && (
                    <Step1Metadata
                        data={state.metadata}
                        mode={id ? 'edit' : 'create'}
                        onChange={updateMetadata}
                        suppliers={suppliers}
                        structures={filteredStructures}
                    />
                )}
                {state.currentStep === 4 && (
                    <Step3AEnergyPrices
                        data={state}
                        structure={currentStructure}
                        onChange={updateRates}
                        onAddDuration={handleAddDuration}
                        onAddValidityPeriod={handleAddValidityPeriod}
                        onDeleteDuration={handleDeleteDuration}
                        onDeleteValidityGroup={handleDeleteValidityGroup}
                        onUpdateValidity={handleUpdateValidity}
                    />
                )}

                {state.currentStep === 5 && (
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
                            onAddDuration={handleAddDuration}
                            onAddValidityPeriod={handleAddValidityPeriod}
                            onDeleteDuration={handleDeleteDuration}
                            onDeleteValidityGroup={handleDeleteValidityGroup}
                            onUpdateValidity={handleUpdateValidity}
                        />
                    )
                )}
                {state.currentStep === 6 && (
                    <Step4ScheduleRules
                        data={state}
                        onChange={(schedules) => setState(prev => ({ ...prev, schedules }))}
                    />
                )}
                {state.currentStep === 7 && (
                    <Step5FeesAndTaxes
                        data={state}
                        onChange={updateRates}
                        onMetadataChange={updateMetadata}
                    />
                )}
                {state.currentStep === 8 && (
                    <Step6Summary
                        data={state}
                        mode={id ? 'edit' : 'create'}
                        fromOCR={!id && candidates.length > 0}
                        onSave={handleFinish}
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
                        cursor: state.currentStep === 1 ? 'not-allowed' : 'pointer',
                        visibility: state.currentStep === 1 || state.currentStep === 2 ? 'hidden' : 'visible' // Hide Back on first steps?
                    }}
                >
                    <ChevronLeft size={16} /> Anterior
                </button>

                {state.currentStep > 2 && state.currentStep < 8 && (
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
