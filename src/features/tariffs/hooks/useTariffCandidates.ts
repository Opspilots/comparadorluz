import { useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { DetectedTariff } from '@/types/tariff';

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

function buildRatesFromCandidate(
    candidate: DetectedTariff,
    versionId: string,
    fallbackValidFrom: string
): TariffRateInsert[] {
    const parsedDuration = candidate.contract_duration ?? null;
    const ratesToInsert: TariffRateInsert[] = [];

    const addRate = (
        p: RateInput,
        type: string,
        defaultUnit: string,
        set: { valid_from?: string | null; valid_to?: string | null; contract_duration?: number | null }
    ) => {
        ratesToInsert.push({
            tariff_version_id: versionId,
            item_type: type,
            period: p.period || 'P1',
            price: p.price,
            unit: p.unit || defaultUnit,
            contract_duration: set.contract_duration !== undefined ? (set.contract_duration ?? null) : (parsedDuration ?? null),
            valid_from: sanitizeDate(set.valid_from !== undefined ? (set.valid_from ?? null) : (fallbackValidFrom ?? null)),
            valid_to: sanitizeDate(set.valid_to !== undefined ? (set.valid_to ?? null) : null)
        });
    };

    const sets = candidate.price_sets && candidate.price_sets.length > 0
        ? candidate.price_sets
        : [{
            energy_prices: candidate.energy_prices,
            power_prices: candidate.power_prices,
            fixed_term_prices: candidate.fixed_term_prices,
            contract_duration: candidate.contract_duration,
            valid_from: fallbackValidFrom,
            valid_to: null
        }];

    sets.forEach(set => {
        (set.energy_prices || []).forEach(p => addRate(p, 'energy', 'EUR/kWh', set));
        (set.power_prices || []).forEach(p => addRate(p, 'power', (p as RateInput).unit || 'EUR/kW/month', set));
        (set.fixed_term_prices || []).forEach(p => addRate(p, 'fixed_fee', 'EUR/month', set));
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
            const { data: company } = await supabase.from('users').select('company_id').eq('id', user.user!.id).single();
            const companyId = company?.company_id;

            const [structsRes, suppsRes] = await Promise.all([
                supabase.from('tariff_structures').select('id, code, name'),
                supabase.from('suppliers').select('id, name').eq('is_active', true)
            ]);

            const structures = structsRes.data || [];
            const suppliers = suppsRes.data || [];

            let savedCount = 0;

            for (const item of selected) {
                let struct = structures.find(s => s.code === item.tariff_structure || s.name.includes(item.tariff_structure || ''));
                let supplier = suppliers.find(s => s.name.toLowerCase().includes((item.supplier_name || '').toLowerCase()));

                if (!struct && structures.length > 0) struct = structures[0];
                if (!supplier && suppliers.length > 0) supplier = suppliers[0];

                if (!supplier || !struct) {
                    console.warn(`Skipping save for ${item.fileName} - no structures or suppliers exist in the database.`);
                    continue;
                }

                const parsedDuration = item.contract_duration ?? null;
                const firstSet = item.price_sets?.[0];

                const rootValidFrom = item.valid_from !== undefined ? item.valid_from : firstSet?.valid_from;
                const rootValidTo = item.valid_to !== undefined ? item.valid_to : firstSet?.valid_to;

                const validFrom = rootValidFrom || new Date().toISOString().split('T')[0];
                const validTo = rootValidTo || null;

                const payload = {
                    company_id: companyId,
                    supplier_id: supplier.id,
                    tariff_structure_id: struct.id,
                    tariff_name: item.tariff_name || 'Tarifa Importada',
                    tariff_type: struct.code || '2.0TD',
                    is_indexed: item.is_indexed || false,
                    contract_duration: parsedDuration,
                    valid_from: sanitizeDate(validFrom),
                    valid_to: sanitizeDate(validTo),
                    completion_status: 'draft',
                    is_active: false
                };

                let versionCheckQuery = supabase
                    .from('tariff_versions')
                    .select('id')
                    .eq('company_id', companyId)
                    .eq('supplier_id', supplier.id)
                    .eq('tariff_structure_id', struct.id)
                    .ilike('tariff_name', payload.tariff_name)
                    .eq('valid_from', validFrom);

                if (parsedDuration === null) {
                    versionCheckQuery = versionCheckQuery.is('contract_duration', null);
                } else {
                    versionCheckQuery = versionCheckQuery.eq('contract_duration', parsedDuration);
                }

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

                const ratesToInsert = buildRatesFromCandidate(item, version.id, validFrom);

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

    // Updates an existing tariff version with the candidate's prices and publishes it
    const quickUpdate = async (candidate: DetectedTariff, existingVersionId: string): Promise<void> => {
        setProcessing(true);
        try {
            const firstSet = candidate.price_sets?.[0];
            const validFrom = firstSet?.valid_from || candidate.valid_from || new Date().toISOString().split('T')[0];

            // Replace rates
            await supabase.from('tariff_rates').delete().eq('tariff_version_id', existingVersionId);

            const ratesToInsert = buildRatesFromCandidate(candidate, existingVersionId, validFrom);

            if (ratesToInsert.length > 0) {
                const { error: rError } = await supabase.from('tariff_rates').insert(ratesToInsert);
                if (rError) throw rError;
            }

            // Update version: new valid_from, mark active and complete
            const { error: vError } = await supabase
                .from('tariff_versions')
                .update({
                    valid_from: sanitizeDate(validFrom),
                    is_active: true,
                    completion_status: 'complete'
                })
                .eq('id', existingVersionId);

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

    // Bulk-updates multiple matched candidates and publishes them
    const bulkUpdate = async (pairs: Array<{ candidate: DetectedTariff; existingVersionId: string }>) => {
        if (pairs.length === 0) return;
        setProcessing(true);
        let updatedCount = 0;
        const processedIds = new Set<string>();

        try {
            for (const { candidate, existingVersionId } of pairs) {
                const firstSet = candidate.price_sets?.[0];
                const validFrom = firstSet?.valid_from || candidate.valid_from || new Date().toISOString().split('T')[0];

                await supabase.from('tariff_rates').delete().eq('tariff_version_id', existingVersionId);

                const ratesToInsert = buildRatesFromCandidate(candidate, existingVersionId, validFrom);

                if (ratesToInsert.length > 0) {
                    const { error: rError } = await supabase.from('tariff_rates').insert(ratesToInsert);
                    if (rError) throw rError;
                }

                const { error: vError } = await supabase
                    .from('tariff_versions')
                    .update({ valid_from: sanitizeDate(validFrom), is_active: true, completion_status: 'complete' })
                    .eq('id', existingVersionId);

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
