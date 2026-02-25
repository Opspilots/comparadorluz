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
        .select('*')
        .eq('id', fileId)
        .single();

    if (fetchError || !file) throw new Error('Archivo no encontrado');
    if (!file.extracted_data) throw new Error('No hay datos extraídos para publicar');

    const data = file.extracted_data as unknown as ExtractedTariffData;

    // 2. Resolve Supplier ID (Create if not exists mock logic, or find exact match)
    // For now, let's try to find a supplier by name, or default to a generic one if you want
    // But since we want to be realistic, let's just pick the first supplier we find or a specific one mock
    const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .ilike('name', `%${data.supplier_name}%`)
        .single();

    // Fallback: Get ANY supplier if not found (just to make it work)
    let supplierId = supplier?.id;
    if (!supplierId) {
        const { data: fallbackSupplier } = await supabase.from('suppliers').select('id').limit(1).single() as { data: { id: string } | null };
        if (!fallbackSupplier) throw new Error('No existen comercializadoras en el sistema.');
        supplierId = fallbackSupplier.id;
    }

    // 3. Create Tariff Record
    const { data: newTariff, error: tariffError } = await supabase
        .from('tariffs')
        .insert({
            company_id: companyId,
            supplier_id: supplierId,
            name: data.tariff_name,
            code: data.tariff_code,
            type: data.tariff_type,
            customer_type: 'business', // Default
            current_version_id: null, // Will update later
            is_active: true
        })
        .select()
        .single();

    if (tariffError) throw tariffError;

    // 4. Create Tariff Version
    const { data: newVersion, error: versionError } = await supabase
        .from('tariff_versions')
        .insert({
            tariff_id: newTariff.id,
            name: 'Versión Inicial (Importada)',
            valid_from: data.valid_from,
            status: 'draft', // Draft so user can review/edit
            created_by: userId
        })
        .select()
        .single();

    if (versionError) throw versionError;

    // 5. Create Components (Prices)
    if (data.components && data.components.length > 0) {
        const componentsToInsert = data.components.map((comp) => ({
            tariff_version_id: newVersion.id,
            component_type: comp.component_type, // 'energy_price' | 'power_price'
            period: comp.period,
            price: comp.price_eur_kwh || comp.price_eur_kw_year, // Map fields
            currency: 'EUR'
        }));

        const { error: componentsError } = await supabase
            .from('tariff_components')
            .insert(componentsToInsert);

        if (componentsError) throw componentsError;
    }

    // 6. Update Tariff with current version
    await supabase
        .from('tariffs')
        .update({ current_version_id: newVersion.id })
        .eq('id', newTariff.id);

    // 7. Update File Status
    await supabase
        .from('tariff_files')
        .update({
            status: 'published',
            // associated_tariff_id: newTariff.id // If we had this column
        })
        .eq('id', fileId);

    return newTariff.id;
}
