import { supabase } from '@/shared/lib/supabase';

interface ExtractedTariffData {
    supplier_name: string;
    tariff_name: string;
    tariff_code: string;
    tariff_type: string;
    valid_from: string;
    components?: Array<{
        component_type: string;
        period: string;
        price_eur_kwh?: number;
        price_eur_kw_year?: number;
    }>;
}

export async function publishBatchFile(fileId: string, companyId: string, userId: string): Promise<string> {
    // 1. Fetch the file and its extracted data
    const { data: file, error: fetchError } = await supabase
        .from('tariff_files')
        .select('*, tariff_batches(id)')
        .eq('id', fileId)
        .eq('company_id', companyId)
        .single();

    if (fetchError || !file) throw new Error('Archivo no encontrado');
    if (!file.extracted_data) throw new Error('No hay datos extraídos para publicar');

    const data = file.extracted_data as unknown as ExtractedTariffData;
    const batchId = file.batch_id || file.tariff_batches?.id || null;

    // Idempotency check: avoid duplicate versions from retries
    if (batchId) {
        const { data: existingVersion } = await supabase
            .from('tariff_versions')
            .select('id')
            .eq('company_id', companyId)
            .eq('batch_id', batchId)
            .eq('tariff_name', data.tariff_name)
            .eq('supplier_name', data.supplier_name)
            .maybeSingle();

        if (existingVersion) {
            // Already published — update file status and return existing version
            await supabase
                .from('tariff_files')
                .update({ status: 'published' })
                .eq('id', fileId);
            return existingVersion.id;
        }
    }

    // 2. Create Tariff Version
    const { data: newVersion, error: versionError } = await supabase
        .from('tariff_versions')
        .insert({
            company_id: companyId,
            batch_id: batchId || null,
            supplier_name: data.supplier_name,
            tariff_name: data.tariff_name,
            tariff_type: data.tariff_type,
            valid_from: data.valid_from,
            is_active: false,
            created_by: userId,
        })
        .select()
        .single();

    if (versionError) throw versionError;

    // 3. Create Tariff Rates (prices)
    try {
        if (data.components && data.components.length > 0) {
            const ratesToInsert = data.components.map((comp) => {
                const isEnergy = comp.component_type === 'energy_price' || comp.component_type === 'energy';
                return {
                    company_id: companyId,
                    tariff_version_id: newVersion.id,
                    item_type: isEnergy ? 'energy' : 'power',
                    period: comp.period,
                    price: comp.price_eur_kwh || comp.price_eur_kw_year || 0,
                    unit: isEnergy ? 'EUR/kWh' : 'EUR/kW/year',
                };
            });

            const { error: ratesError } = await supabase
                .from('tariff_rates')
                .insert(ratesToInsert);

            if (ratesError) throw ratesError;
        }
    } catch (ratesError) {
        // Rollback: delete orphaned tariff_version if rates insert fails
        await supabase
            .from('tariff_versions')
            .delete()
            .eq('id', newVersion.id);
        // Mark the file as errored so the UI reflects the failure
        await supabase
            .from('tariff_files')
            .update({ extraction_status: 'error' })
            .eq('id', fileId)
            .eq('company_id', companyId);
        throw ratesError;
    }

    // 4. Update File Status
    await supabase
        .from('tariff_files')
        .update({ status: 'published' })
        .eq('id', fileId);

    return newVersion.id;
}
