import { useState } from 'react';
import { TariffWizardState } from '@/types/tariff';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Loader2, Upload, FileText, AlertCircle } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf'; // Renamed import to avoid conflict
import { parsePdfText } from '@/shared/lib/pdf-utils';

// Styles for react-pdf
// Styles for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker configuration
// Worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

interface Step2Props {
    data: TariffWizardState;
    onDataExtracted?: (extractedData: Partial<TariffWizardState['metadata']>) => void;
}

export function Step2ParserPreview({ data, onDataExtracted }: Step2Props) {
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
            // 1. Text Extraction
            const { text } = await parsePdfText(f);
            console.log("Extracted Text Preview:", text.substring(0, 500));

            // 2. Mock Logic for automatic field detection (Replace with real Regex/AI later)
            // Example: "Tarifa 2.0TD" -> set structure
            const extractedMetadata: any = {};

            if (text.includes('2.0TD')) extractedMetadata.tariff_structure_id = '20td-uuid-placeholder'; // Needs real lookup
            // For now, we simulate extraction delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            console.log("Context Data:", data); // Use data to avoid lint
            if (onDataExtracted) onDataExtracted(extractedMetadata);

        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
            {/* Left: Upload & Controls */}
            <div className="space-y-6">
                <h2 className="text-xl font-semibold">Carga e Importación</h2>

                {!file ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Sube tu factura o contrato</h3>
                        <p className="text-sm text-gray-500 mb-4">PDF, PNG o JPG hasta 10MB</p>
                        <Button variant="outline" className="relative">
                            Seleccionar Archivo
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".pdf,image/*"
                                onChange={handleFileChange}
                            />
                        </Button>
                    </div>
                ) : (
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <FileText className="h-8 w-8 text-blue-500" />
                                <div>
                                    <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-red-500">
                                Cambiar
                            </Button>
                        </div>

                        {processing ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analizando documento...
                                </div>
                                <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 animate-progress"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded p-3 flex gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-green-900">Análisis Completado</p>
                                    <p className="text-xs text-green-700">Se han detectado posibles datos de la tarifa. Revisa los campos en los siguientes pasos.</p>
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Instrucciones
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc pl-4">
                        <li>Sube una factura reciente o el contrato oficial.</li>
                        <li>El sistema intentará detectar precios y periodos automáticamente.</li>
                        <li>Podrás corregir manualmente cualquier dato en los pasos 3 y 4.</li>
                    </ul>
                </div>
            </div>

            {/* Right: PDF Viewer */}
            <div className="bg-gray-100 rounded-lg border overflow-hidden flex flex-col h-full">
                <div className="bg-white border-b p-2 flex justify-between items-center shadow-sm z-10">
                    <span className="text-xs font-medium text-gray-500">Vista Previa</span>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>-</Button>
                        <span className="text-xs w-12 text-center">{(scale * 100).toFixed(0)}%</span>
                        <Button variant="ghost" size="sm" onClick={() => setScale(s => Math.min(2.0, s + 0.1))}>+</Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 flex justify-center bg-gray-500/5">
                    {file ? (
                        <Document
                            file={file}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<Loader2 className="h-8 w-8 animate-spin text-gray-400" />}
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
                        <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                            <FileText className="h-16 w-16 mb-2 opacity-20" />
                            <p>Sube un documento para visualizarlo</p>
                        </div>
                    )}
                </div>

                {file && numPages > 0 && (
                    <div className="bg-white border-t p-2 flex justify-center items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(p => p - 1)}
                        >
                            Anterior
                        </Button>
                        <span className="text-xs text-gray-600">
                            Página {pageNumber} de {numPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={pageNumber >= numPages}
                            onClick={() => setPageNumber(p => p + 1)}
                        >
                            Siguiente
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
