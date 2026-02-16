import { useState } from 'react';
import { TariffWizardState, TariffRate } from '@/types/tariff';
import { Loader2, Upload, FileText } from 'lucide-react';
import { Document, Page } from 'react-pdf'; // Renamed import to avoid conflict
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/shared/lib/supabase';


// Styles for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface Step2Props {
    data: TariffWizardState;
    onDataExtracted?: (
        metadata: Partial<TariffWizardState['metadata']>,
        rates?: TariffWizardState['rates']
    ) => void;
}

export function Step2ParserPreview({ onDataExtracted }: Step2Props) {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            processFile(selectedFile);
        }
    };

    const processFile = async (f: File) => {
        setProcessing(true);
        try {
            // 1. Validar Tipo de Archivo (PDF o Imagen)
            if (!f.type.includes('pdf') && !f.type.includes('image')) {
                toast({ variant: 'destructive', title: 'Error', description: 'Por favor sube un PDF o una Imagen.' });
                return;
            }

            // 2. Llamar a Supabase Edge Function (Gemini)
            const formData = new FormData();
            formData.append('file', f);

            // Refresh session to ensure valid token
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

            if (sessionError || !session) {
                console.error("Session refresh error:", sessionError);
                throw new Error("Tu sesión ha expirado. Por favor, recarga la página e inicia sesión nuevamente.");
            }

            console.log("Session valid. Token starts with:", session.access_token.substring(0, 10) + "...");

            // Using invoke to call our new function
            const { data: extracted, error } = await supabase.functions.invoke('parse-tariff-document', {
                body: formData,
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;
            if (!extracted) throw new Error("No se recibieron datos de la IA");

            console.log("IA Extraction Result:", extracted);

            // 3. Map AI Result to Wizard State
            const metadata: Partial<TariffWizardState['metadata']> = {};
            const rates: TariffWizardState['rates'] = [];

            // Map Metadata
            if (extracted.tariff_name) metadata.name = extracted.tariff_name;
            if (extracted.tariff_structure) metadata.tariff_structure_id = extracted.tariff_structure;
            if (extracted.supplier_name) metadata.supplier_id = extracted.supplier_name;
            if (extracted.is_indexed !== undefined) metadata.is_indexed = extracted.is_indexed;

            // Map Rates
            const createRate = (item: { period?: string, price: number, unit?: string }, type: 'energy' | 'power' | 'fixed_fee'): TariffRate => ({
                id: crypto.randomUUID(),
                tariff_version_id: '',
                item_type: type,
                period: item.period || (type === 'fixed_fee' ? 'P1' : undefined),
                price: item.price,
                unit: item.unit || (type === 'energy' ? 'EUR/kWh' : type === 'power' ? 'EUR/kW/year' : 'EUR/month'),
            });

            if (extracted.energy_prices && Array.isArray(extracted.energy_prices)) {
                extracted.energy_prices.forEach((p: { period?: string, price: number, unit?: string }) => rates.push(createRate(p, 'energy')));
            }

            if (extracted.power_prices && Array.isArray(extracted.power_prices)) {
                extracted.power_prices.forEach((p: { period?: string, price: number, unit?: string }) => rates.push(createRate(p, 'power')));
            }

            if (extracted.fixed_term_prices && Array.isArray(extracted.fixed_term_prices)) {
                extracted.fixed_term_prices.forEach((p: { period?: string, price: number, unit?: string }) => rates.push(createRate(p, 'fixed_fee')));
            }

            // 4. Pass Request Up
            if (onDataExtracted) {
                onDataExtracted(metadata, rates);
            }

            toast({ title: "Análisis Completado", description: "Datos extraídos correctamente." });

        } catch (err) {
            const error = err as any;
            console.error('Error parsing document:', error);
            // Log detailed error if available from Edge Function
            if (error.context && error.context.json) {
                error.context.json().then((errJson: any) => {
                    console.error("Edge Function Error Details:", errJson);
                    // Show specific message for 429 or known errors
                    if (errJson.error) {
                        toast({
                            variant: 'destructive',
                            title: 'Error de IA',
                            description: errJson.error
                        });
                    }
                }).catch(() => { });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error de Análisis',
                    description: error.message || 'No se pudo analizar el documento.'
                });
            }
        } finally {
            setProcessing(false);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', height: '600px' }}>
            {/* Left: Upload & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Carga e Importación</h2>

                {!file ? (
                    <div style={{
                        border: '2px dashed #d1d5db',
                        borderRadius: '0.5rem',
                        padding: '3rem',
                        textAlign: 'center',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer',
                        backgroundColor: 'var(--surface-alt)'
                    }}>
                        <Upload size={48} style={{ color: '#9ca3af', margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: '#111827', margin: 0 }}>Sube tu factura o contrato</h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>PDF, PNG o JPG hasta 10MB</p>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500,
                                borderRadius: '0.375rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
                                color: 'var(--text-main)', cursor: 'pointer'
                            }}>
                                Seleccionar Archivo
                            </button>
                            <input
                                type="file"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer'
                                }}
                                accept=".pdf,image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FileText size={32} style={{ color: '#3b82f6' }} />
                                <div>
                                    <p style={{ fontWeight: 500, fontSize: '0.875rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{file.name}</p>
                                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button onClick={() => setFile(null)} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem' }}>
                                Cambiar
                            </button>
                        </div>

                        {processing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#2563eb' }}>
                                    <Loader2 size={16} className="animate-spin" />
                                    Analizando documento...
                                </div>
                                <div style={{ height: '0.375rem', width: '100%', background: '#dbeafe', borderRadius: '9999px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: '#2563eb', width: '50%' }}></div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.25rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <div style={{ height: '0.5rem', width: '0.5rem', borderRadius: '50%', background: '#22c55e', marginTop: '0.375rem', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#14532d', margin: 0 }}>Análisis Completado</p>
                                        <p style={{ fontSize: '0.75rem', color: '#15803d', margin: 0 }}>Se han detectado posibles datos de la tarifa. Revisa los campos en los siguientes pasos.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Right: PDF Viewer */}
            <div style={{ background: 'var(--surface-alt)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>Vista Previa</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} style={{ padding: '0.25rem 0.5rem', border: '1px solid #e5e7eb', background: 'white', borderRadius: '0.25rem', cursor: 'pointer' }}>-</button>
                        <span style={{ fontSize: '0.75rem', width: '3rem', textAlign: 'center' }}>{(scale * 100).toFixed(0)}%</span>
                        <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} style={{ padding: '0.25rem 0.5rem', border: '1px solid #e5e7eb', background: 'white', borderRadius: '0.25rem', cursor: 'pointer' }}>+</button>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', justifyContent: 'center', background: '#f9fafb' }}>
                    {file ? (
                        <Document
                            file={file}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<Loader2 size={32} className="animate-spin text-gray-400" />}
                            className="shadow-lg"
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                className="bg-white"
                            />
                        </Document>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', height: '100%' }}>
                            <FileText size={64} style={{ marginBottom: '0.5rem', opacity: 0.2 }} />
                            <p style={{ margin: 0 }}>Sube un documento para visualizarlo</p>
                        </div>
                    )}
                </div>

                {file && numPages > 0 && (
                    <div style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                        <button
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(p => p - 1)}
                            style={{
                                padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                                borderRadius: '0.25rem', border: '1px solid #d1d5db', backgroundColor: 'white',
                                color: pageNumber <= 1 ? '#9ca3af' : '#374151',
                                cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Anterior
                        </button>
                        <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                            Página {pageNumber} de {numPages}
                        </span>
                        <button
                            disabled={pageNumber >= numPages}
                            onClick={() => setPageNumber(p => p + 1)}
                            style={{
                                padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                                borderRadius: '0.25rem', border: '1px solid #d1d5db', backgroundColor: 'white',
                                color: pageNumber >= numPages ? '#9ca3af' : '#374151',
                                cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
