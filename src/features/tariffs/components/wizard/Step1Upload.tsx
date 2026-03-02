
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/shared/lib/supabase';
import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { DetectedTariff } from '@/types/tariff';

interface Step1UploadProps {
    onTariffsDetected: (newCandidates: DetectedTariff[], file: File) => void;
    onManualEntry: () => void;
}

export function Step1Upload({ onTariffsDetected, onManualEntry }: Step1UploadProps) {
    const { toast } = useToast();
    const [processing, setProcessing] = useState(false);

    // PDF Viewer State (Local to upload step for previewing BEFORE parsing?)
    // Actually, user wants preview alongside parsing?
    // In the previous code, preview was always visible.
    // Let's keep it simple: Upload -> Process -> Result.

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (processing) return;
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            processFile(selectedFile);
        }
    };

    const processFile = async (f: File) => {
        setProcessing(true);
        try {
            if (!f.type.includes('pdf') && !f.type.includes('image')) {
                toast({ variant: 'destructive', title: 'Error', description: 'Por favor sube un PDF o una Imagen.' });
                setProcessing(false);
                return;
            }

            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
            if (sessionError || !session) throw new Error("Sesión expirada.");

            const formData = new FormData();
            formData.append('file', f);

            const fnResponse = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-tariff-document`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    body: formData,
                }
            );

            if (!fnResponse.ok) {
                const errData = await fnResponse.json().catch(() => ({ error: `HTTP ${fnResponse.status}` }));
                throw new Error(errData.error || `Error ${fnResponse.status} al analizar el documento.`);
            }

            const extracted = await fnResponse.json();
            if (!extracted) throw new Error("No se recibieron datos de la IA");

            const rawTariffs = extracted.tariffs && Array.isArray(extracted.tariffs) ? extracted.tariffs : [extracted];
            const newCandidates: DetectedTariff[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rawTariffs.forEach((t: any) => {
                // Normalize contract_duration to number (months)
                let duration: number | null = null;
                if (t.contract_duration != null) {
                    if (typeof t.contract_duration === 'number') {
                        duration = t.contract_duration;
                    } else {
                        // Legacy: parse "12 meses", "1 año", "24 meses", etc.
                        const str = String(t.contract_duration).toLowerCase().trim();
                        const monthsMatch = str.match(/(\d+)\s*mes/);
                        const yearsMatch = str.match(/(\d+)\s*a[ñn]o/);
                        if (monthsMatch) duration = parseInt(monthsMatch[1]);
                        else if (yearsMatch) duration = parseInt(yearsMatch[1]) * 12;
                        else {
                            const num = parseInt(str);
                            if (!isNaN(num)) duration = num;
                        }
                    }
                }

                // Build price_sets: use new format or wrap legacy flat arrays
                let priceSets: DetectedTariff['price_sets'] = [];
                if (t.price_sets && Array.isArray(t.price_sets) && t.price_sets.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    priceSets = t.price_sets.map((ps: any) => {
                        // Parse per-set contract_duration, falling back to the root tariff duration
                        let setDuration: number | null = null;
                        if (ps.contract_duration != null) {
                            setDuration = typeof ps.contract_duration === 'number'
                                ? ps.contract_duration
                                : parseInt(String(ps.contract_duration), 10) || null;
                        } else {
                            setDuration = duration; // Inherit from root tariff
                        }

                        return {
                            contract_duration: setDuration,
                            valid_from: ps.valid_from || undefined,
                            valid_to: ps.valid_to || undefined,
                            energy_prices: ps.energy_prices || [],
                            power_prices: ps.power_prices || [],
                            fixed_term_prices: ps.fixed_term_prices || [],
                        };
                    });
                } else {
                    // Legacy fallback: single price_set from flat arrays
                    priceSets = [{
                        contract_duration: duration,
                        valid_from: t.validity_date || undefined,
                        valid_to: undefined,
                        energy_prices: t.energy_prices || [],
                        power_prices: t.power_prices || [],
                        fixed_term_prices: t.fixed_term_prices || [],
                    }];
                }

                // Build legacy flat arrays from first price_set for UI display compat
                const firstSet = priceSets[0] || { energy_prices: [], power_prices: [], fixed_term_prices: [] };

                newCandidates.push({
                    id: crypto.randomUUID(),
                    fileName: f.name,
                    supplier_name: t.supplier_name,
                    tariff_name: t.tariff_name,
                    tariff_structure: t.tariff_structure,
                    supply_type: t.supply_type || undefined,
                    contract_duration: duration,
                    is_indexed: t.is_indexed,
                    price_sets: priceSets,
                    energy_prices: firstSet.energy_prices,
                    power_prices: firstSet.power_prices,
                    fixed_term_prices: firstSet.fixed_term_prices,
                });
            });

            onTariffsDetected(newCandidates, f);
            toast({ title: "Análisis Completado", description: `Se han detectado ${newCandidates.length} tarifa(s).` });

        } catch (err: unknown) {
            console.error('Error parsing document:', err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            toast({ variant: 'destructive', title: 'Error', description: errorMsg || 'Error al analizar el documento.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-full max-w-md">
                <div className={cn(
                    "border-2 dashed rounded-lg p-10 text-center transition-colors cursor-pointer",
                    processing ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:bg-gray-50"
                )}>
                    {processing ? (
                        <div className="flex flex-col items-center py-4">
                            <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
                            <span className="text-lg font-medium text-blue-700">Analizando documento...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center relative">
                            <Upload size={48} className="text-gray-400 mb-4" />
                            <h3 className="text-xl font-medium text-gray-900 mb-2">Subir factura o contrato</h3>
                            <p className="text-gray-500 mb-6">PDF, PNG o JPG hasta 10MB</p>

                            <div className="relative w-full">
                                <button className="btn btn-primary w-full pointer-events-none">
                                    Seleccionar Archivo
                                </button>
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept=".pdf,image/*"
                                    onChange={handleFileChange}
                                    value=""
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <span className="text-gray-400 text-sm">¿Prefieres introducir los datos a mano?</span>
                    <button onClick={onManualEntry} className="text-blue-600 font-medium text-sm ml-2 hover:underline">
                        Entrada Manual
                    </button>
                </div>
            </div>
        </div>
    );
}
