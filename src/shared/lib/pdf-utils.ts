import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set worker to absolute path or CDN to avoid build issues
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

export interface ParsedPdfData {
    text: string;
    totalPages: number;
}

export const parsePdfText = async (file: File): Promise<ParsedPdfData> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += `--- Page ${i} ---\n${pageText}\n`;
        }

        return {
            text: fullText,
            totalPages: pdf.numPages
        };
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('No se pudo leer el archivo PDF.');
    }
};
