import { supabase } from '@/shared/lib/supabase';

/**
 * Simulates the backend processing of a tariff file.
 * In production, this would be an Edge Function triggered by storage events.
 */
export async function processBatchMock(batchId: string) {

    try {
        // 1. Fetch files in batch
        const { data: files } = await supabase
            .from('tariff_files')
            .select('*')
            .eq('batch_id', batchId);

        if (!files || files.length === 0) return;

        // 2. Simulate processing delay for each file
        for (const file of files) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay per file

            // 3. Generate mock extraction data
            const mockData = generateMockTariffData(file.filename);

            // 4. Update file status to completed
            await supabase
                .from('tariff_files')
                .update({
                    status: 'completed', // Update main status to completed so it appears as "Ready to Review"
                    extraction_status: 'completed',
                    extracted_data: mockData
                })
                .eq('id', file.id);


        }

        // 5. Update batch status to 'pending_review'
        await supabase
            .from('tariff_batches')
            .update({
                status: 'pending_review',
                updated_at: new Date().toISOString()
            })
            .eq('id', batchId);



    } catch (err) {
        console.error('[Mock Pipeline] Error:', err);
    }
}

function generateMockTariffData(filename: string) {
    // Determine supplier based on filename (simple heuristic)
    const supplier = filename.toLowerCase().includes('iberdrola') ? 'Iberdrola' :
        filename.toLowerCase().includes('endesa') ? 'Endesa' :
            'Generica';

    // Mock data structure matching TariffVersion
    return {
        supplier_name: supplier,
        tariff_name: `Tarifa ${supplier} 2026`,
        tariff_code: `T-${Math.floor(Math.random() * 1000)}`,
        tariff_type: '2.0TD',
        valid_from: new Date().toISOString().split('T')[0],
        components: [
            { component_type: 'energy_price', period: 'P1', price_eur_kwh: 0.15 + (Math.random() * 0.05) },
            { component_type: 'energy_price', period: 'P2', price_eur_kwh: 0.10 + (Math.random() * 0.05) },
            { component_type: 'energy_price', period: 'P3', price_eur_kwh: 0.08 + (Math.random() * 0.05) },
            { component_type: 'power_price', period: 'P1', price_eur_kw_year: 30.0 },
            { component_type: 'power_price', period: 'P2', price_eur_kw_year: 15.0 },
        ]
    };
}
