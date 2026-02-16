import { pdfjs } from 'react-pdf';

export interface ParsedPdfData {
    text: string;
    totalPages: number;
}

export const parsePdfText = async (file: File): Promise<ParsedPdfData> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        // Convert to Uint8Array to ensure compatibility
        const data = new Uint8Array(arrayBuffer);

        console.log('PDF Utils: Starting document load', { size: data.length });
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;

        console.log('PDF Utils: Document loaded', { numPages: pdf.numPages });
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
