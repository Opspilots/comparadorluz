import { useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { DetectedTariff } from '@/shared/types';

interface RateInput {
    period?: string;
    price: number;
    unit?: string;
}

interface TariffRateInsert {
    tariff_version_id: string;
    item_type: string;
    period: string;
    price: number;
    unit: string;
    contract_duration?: number | null;
    valid_from?: string | null;
    valid_to?: string | null;
}

const sanitizeDate = (d: unknown) => {
    if (!d) return null;
    const dateObj = new Date(d as string);
    return isNaN(dateObj.getTime()) ? null : d as string;
};

/**
 * Compute the overall valid_from (earliest) and valid_to (latest) across all price_sets.
 * Falls back to today if no dates are found.
 */
function computeVersionDateRange(candidate: DetectedTariff): { validFrom: string; validTo: string | null } {
    const today = new Date().toISOString().split('T')[0];
    const sets = candidate.price_sets || [];

    let earliest: string | null = null;
    let latest: string | null = null;

    for (const s of sets) {
        const from = sanitizeDate(s.valid_from);
        const to = sanitizeDate(s.valid_to);
        if (from && (!earliest || from < earliest)) earliest = from;
        if (to && (!latest || to > latest)) latest = to;
    }

    // Fallback to candidate-level dates
    if (!earliest) earliest = sanitizeDate(candidate.valid_from) || today;
    if (!latest) latest = sanitizeDate(candidate.valid_to) || null;

    return { validFrom: earliest, validTo: latest };
}

function buildRatesFromCandidate(
    candidate: DetectedTariff,
    versionId: string,
): TariffRateInsert[] {
    const ratesToInsert: TariffRateInsert[] = [];

    const addRate = (
        p: RateInput,
        type: string,
        defaultUnit: string,
        setMeta: { contract_duration?: number | null; valid_from?: string | null; valid_to?: string | null },
    ) => {
        ratesToInsert.push({
            tariff_version_id: versionId,
            item_type: type,
            period: p.period || 'P1',
            price: p.price,
            unit: p.unit || defaultUnit,
            contract_duration: setMeta.contract_duration ?? null,
            valid_from: sanitizeDate(setMeta.valid_from) || null,
            valid_to: sanitizeDate(setMeta.valid_to) || null,
        });
    };

    const sets = candidate.price_sets && candidate.price_sets.length > 0
        ? candidate.price_sets
        : [{
            energy_prices: candidate.energy_prices,
            power_prices: candidate.power_prices,
            fixed_term_prices: candidate.fixed_term_prices,
            contract_duration: candidate.contract_duration,
            valid_from: candidate.valid_from,
            valid_to: candidate.valid_to,
        }];

    sets.forEach(set => {
        const meta = {
            contract_duration: set.contract_duration ?? candidate.contract_duration ?? null,
            valid_from: set.valid_from || null,
            valid_to: set.valid_to || null,
        };
        (set.energy_prices || []).forEach(p => addRate(p, 'energy', 'EUR/kWh', meta));
        (set.power_prices || []).forEach(p => addRate(p, 'power', (p as RateInput).unit || 'EUR/kW/month', meta));
        (set.fixed_term_prices || []).forEach(p => addRate(p, 'fixed_fee', 'EUR/month', meta));
    });

    return ratesToInsert;
}

export function useTariffCandidates(
    candidates: DetectedTariff[],
    onUpdateCandidates: (newCandidates: DetectedTariff[]) => void
) {
    const { toast } = useToast();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkSave = async (overrideIds?: Set<string>) => {
        const idsToProcess = overrideIds ?? selectedIds;
        const selected = candidates.filter(c => idsToProcess.has(c.id));
        if (selected.length === 0) return;

        setProcessing(true);
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) throw new Error('Usuario no autenticado');
            const { data: company } = await supabase.from('users').select('company_id').eq('id', user.user.id).maybeSingle();
            const companyId = company?.company_id;
            if (!companyId) throw new Error('Empresa no encontrada');

            const [structsRes, suppsRes] = await Promise.all([
                supabase.from('tariff_structures').select('id, code, name'),
                supabase.from('suppliers').select('id, name').eq('is_active', true)
            ]);

            const structures = structsRes.data || [];
            const suppliers = suppsRes.data || [];

            let savedCount = 0;

            for (const item of selected) {
                let struct = structures.find(s => s.code === item.tariff_structure || s.name.includes(item.tariff_structure || ''));
                let supplier = suppliers.find(s => s.name.toLowerCase() === (item.supplier_name || '').toLowerCase())
                    || suppliers.find(s => s.name.toLowerCase().includes((item.supplier_name || '').toLowerCase()));

                if (!struct && structures.length > 0) struct = structures[0];

                // Auto-create supplier if not found
                if (!supplier && item.supplier_name) {
                    const slug = item.supplier_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    const { data: newSupplier, error: sError } = await supabase
                        .from('suppliers')
                        .insert({ company_id: companyId, name: item.supplier_name, slug, is_active: true })
                        .select()
                        .single();
                    if (!sError && newSupplier) {
                        supplier = newSupplier;
                        suppliers.push(newSupplier);
                    }
                }

                if (!supplier || !struct) {
                    console.warn(`Skipping save for ${item.fileName} - no structures or suppliers exist in the database.`);
                    continue;
                }

                const { validFrom, validTo } = computeVersionDateRange(item);

                const payload = {
                    company_id: companyId,
                    supplier_id: supplier.id,
                    tariff_structure_id: struct.id,
                    tariff_name: item.tariff_name || 'Tarifa Importada',
                    tariff_type: struct.code || '2.0TD',
                    is_indexed: item.is_indexed || false,
                    valid_from: sanitizeDate(validFrom),
                    valid_to: sanitizeDate(validTo),
                    completion_status: 'draft',
                    is_active: false
                };

                const versionCheckQuery = supabase
                    .from('tariff_versions')
                    .select('id')
                    .eq('company_id', companyId)
                    .eq('supplier_id', supplier.id)
                    .eq('tariff_structure_id', struct.id)
                    .ilike('tariff_name', payload.tariff_name)
                    .eq('valid_from', validFrom);

                const { data: existingVersion, error: existingError } = await versionCheckQuery.maybeSingle();

                if (existingError && existingError.code !== 'PGRST116') {
                    throw existingError;
                }

                let version;
                let vError;

                if (existingVersion) {
                    const { data: updatedVersion, error: updateError } = await supabase
                        .from('tariff_versions')
                        .update(payload)
                        .eq('id', existingVersion.id)
                        .select()
                        .single();
                    version = updatedVersion;
                    vError = updateError;
                } else {
                    const { data: insertedVersion, error: insertError } = await supabase
                        .from('tariff_versions')
                        .insert(payload)
                        .select()
                        .single();
                    version = insertedVersion;
                    vError = insertError;
                }

                if (vError || !version) throw vError || new Error("Failed to create or update version");

                await supabase.from('tariff_rates').delete().eq('tariff_version_id', version.id);

                const ratesToInsert = buildRatesFromCandidate(item, version.id);

                if (ratesToInsert.length > 0) {
                    const { error: rError } = await supabase.from('tariff_rates').insert(ratesToInsert);
                    if (rError) throw rError;
                }
                savedCount++;
            }

            if (savedCount > 0) {
                toast({ title: "Guardado", description: `${savedCount} tarifas guardadas como borrador.` });
                const processedIds = idsToProcess;
                const remaining = candidates.filter(c => !processedIds.has(c.id));
                onUpdateCandidates(remaining);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    processedIds.forEach(id => next.delete(id));
                    return next;
                });
            } else {
                toast({ variant: 'destructive', title: "Error", description: "No se pudieron guardar las tarifas seleccionadas." });
            }

        } catch (e: unknown) {
            const err = e as Error;
            console.error("Bulk save error:", err);
            toast({ variant: 'destructive', title: "Error al guardar", description: err.message });
        } finally {
            setProcessing(false);
        }
    };

    const quickUpdate = async (candidate: DetectedTariff, existingVersionId: string): Promise<void> => {
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle();
            if (!profile?.company_id) throw new Error('Perfil no encontrado');

            const { validFrom, validTo } = computeVersionDateRange(candidate);

            await supabase.from('tariff_rates').delete().eq('tariff_version_id', existingVersionId);

            const ratesToInsert = buildRatesFromCandidate(candidate, existingVersionId);

            if (ratesToInsert.length > 0) {
                const { error: rError } = await supabase.from('tariff_rates').insert(ratesToInsert);
                if (rError) throw rError;
            }

            const { error: vError } = await supabase
                .from('tariff_versions')
                .update({
                    valid_from: sanitizeDate(validFrom),
                    valid_to: sanitizeDate(validTo),
                    is_active: true,
                    completion_status: 'complete'
                })
                .eq('id', existingVersionId)
                .eq('company_id', profile.company_id);

            if (vError) throw vError;

            toast({ title: "Tarifa actualizada", description: `"${candidate.tariff_name}" actualizada y publicada.` });
            onUpdateCandidates(candidates.filter(c => c.id !== candidate.id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(candidate.id);
                return next;
            });
        } catch (e: unknown) {
            const err = e as Error;
            toast({ variant: 'destructive', title: "Error al actualizar", description: err.message });
        } finally {
            setProcessing(false);
        }
    };

    const bulkUpdate = async (pairs: Array<{ candidate: DetectedTariff; existingVersionId: string }>) => {
        if (pairs.length === 0) return;
        setProcessing(true);
        let updatedCount = 0;
        const processedIds = new Set<string>();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle();
            if (!profile?.company_id) throw new Error('Perfil no encontrado');

            for (const { candidate, existingVersionId } of pairs) {
                const { validFrom, validTo } = computeVersionDateRange(candidate);

                await supabase.from('tariff_rates').delete().eq('tariff_version_id', existingVersionId);

                const ratesToInsert = buildRatesFromCandidate(candidate, existingVersionId);

                if (ratesToInsert.length > 0) {
                    const { error: rError } = await supabase.from('tariff_rates').insert(ratesToInsert);
                    if (rError) throw rError;
                }

                const { error: vError } = await supabase
                    .from('tariff_versions')
                    .update({
                        valid_from: sanitizeDate(validFrom),
                        valid_to: sanitizeDate(validTo),
                        is_active: true,
                        completion_status: 'complete'
                    })
                    .eq('id', existingVersionId)
                    .eq('company_id', profile.company_id);

                if (vError) throw vError;
                processedIds.add(candidate.id);
                updatedCount++;
            }

            toast({ title: "Actualización masiva completada", description: `${updatedCount} tarifas actualizadas y publicadas.` });
            onUpdateCandidates(candidates.filter(c => !processedIds.has(c.id)));
            setSelectedIds(prev => {
                const next = new Set(prev);
                processedIds.forEach(id => next.delete(id));
                return next;
            });
        } catch (e: unknown) {
            const err = e as Error;
            toast({ variant: 'destructive', title: "Error en actualización masiva", description: err.message });
        } finally {
            setProcessing(false);
        }
    };

    return {
        selectedIds,
        setSelectedIds,
        processing,
        toggleSelection,
        handleBulkSave,
        quickUpdate,
        bulkUpdate
    };
}
