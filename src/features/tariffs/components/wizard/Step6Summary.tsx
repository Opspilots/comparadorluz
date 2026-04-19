import { TariffWizardState } from '@/shared/types';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { getErrorMessage } from '@/shared/lib/errors';

interface Step6Props {
    data: TariffWizardState;
    mode?: 'create' | 'edit';
    fromOCR?: boolean;
    onSave: () => void;
}

export function Step6Summary({ data, mode = 'create', fromOCR = false, onSave }: Step6Props) {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { id } = useParams();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Early return before derived variables to prevent null access
    if (!data) return null;

    // Validation status
    const hasRates = data.rates && data.rates.length > 0;
    const isComplete = data.metadata.supplier_id && data.metadata.name && data.metadata.tariff_structure_id && hasRates;

    const handleDelete = async () => {
        if (!id) return;

        setSaving(true);
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) throw new Error('Sesión expirada');
            const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.user.id).maybeSingle();
            if (!profile?.company_id) throw new Error('No se encontró el perfil de empresa.');
            const { error } = await supabase.from('tariff_versions').delete().eq('id', id).eq('company_id', profile.company_id);
            if (error) throw error;
            toast({ title: 'Tarifa eliminada', description: 'La tarifa ha sido eliminada correctamente.' });
            navigate('/admin/tariffs');
        } catch (error: unknown) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la tarifa.' });
        } finally {
            setSaving(false);
            setShowDeleteDialog(false);
        }
    };

    const handleSave = async (activate: boolean) => {
        // Validate required UUID fields before hitting the DB
        if (!data.metadata.supplier_id) {
            toast({ variant: 'destructive', title: 'Falta comercializadora', description: 'Selecciona una comercializadora antes de guardar.' });
            return;
        }
        if (!data.metadata.name) {
            toast({ variant: 'destructive', title: 'Falta nombre', description: 'Introduce un nombre para la tarifa antes de guardar.' });
            return;
        }
        const negativeRate = data.rates.find(r => r.price != null && r.price < 0);
        if (negativeRate) {
            toast({ variant: 'destructive', title: 'Precio negativo', description: `El precio del periodo ${negativeRate.period} (${negativeRate.item_type}) no puede ser negativo.` });
            return;
        }

        setSaving(true);
        try {
            // Helper to prevent e.g '2026-02-29' crashing Supabase inserts
            const sanitizeDate = (d: string | null | undefined) => {
                if (!d) return null;
                const dateObj = new Date(d);
                return isNaN(dateObj.getTime()) ? null : d;
            };

            // Helper to prevent empty strings being sent as UUID values
            const sanitizeUuid = (v: string | null | undefined) => (v && v.trim() !== '' ? v : null);

            // 1. Prepare Payload
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) throw new Error('Sesión expirada. Recarga la página.');
            const { data: company } = await supabase.from('users').select('company_id').eq('id', user.user.id).maybeSingle();
            if (!company?.company_id) throw new Error('Perfil de empresa no encontrado.');

            const structureId = sanitizeUuid(data.metadata.tariff_structure_id);
            const { data: selectedStructure } = structureId ? await supabase
                .from('tariff_structures')
                .select('code')
                .eq('id', structureId)
                .single() : { data: null };

            const payload = {
                company_id: company?.company_id,
                supplier_id: sanitizeUuid(data.metadata.supplier_id),
                tariff_structure_id: structureId,
                tariff_name: data.metadata.name,
                tariff_code: data.metadata.code,
                tariff_type: selectedStructure?.code || '2.0TD',
                is_indexed: data.metadata.is_indexed,
                valid_from: sanitizeDate(data.metadata.valid_from),
                valid_to: sanitizeDate((data.metadata as Record<string, unknown>).valid_to as string | null | undefined),
                contract_duration: data.metadata.contract_duration,
                commission_type: data.metadata.commission_type || 'percentage',
                commission_value: data.metadata.commission_value ?? 0,
                is_active: activate,
                completion_status: isComplete ? 'complete' : 'draft'
            };

            let versionId = id;

            if (id) {
                // Edit mode: update existing version
                const { data: version, error: vError } = await supabase
                    .from('tariff_versions')
                    .update(payload)
                    .eq('id', id)
                    .eq('company_id', payload.company_id)
                    .select()
                    .single();
                if (vError) throw vError;
                versionId = version.id;
            } else if (mode === 'create') {
                    let versionCheckQuery = supabase
                        .from('tariff_versions')
                        .select('id')
                        .eq('company_id', payload.company_id)
                        .eq('supplier_id', payload.supplier_id)
                        .eq('tariff_structure_id', payload.tariff_structure_id)
                        .ilike('tariff_name', payload.tariff_name)
                        .eq('valid_from', payload.valid_from);

                    if (payload.contract_duration === null || payload.contract_duration === undefined) {
                        versionCheckQuery = versionCheckQuery.is('contract_duration', null);
                    } else {
                        versionCheckQuery = versionCheckQuery.eq('contract_duration', payload.contract_duration);
                    }

                    const { data: existingVersion, error: existingError } = await versionCheckQuery.maybeSingle();

                    if (existingError && existingError.code !== 'PGRST116') {
                        throw existingError;
                    }

                    if (existingVersion) {
                        const { data: updatedVersion, error: updateError } = await supabase
                            .from('tariff_versions')
                            .update(payload)
                            .eq('id', existingVersion.id)
                            .select()
                            .single();
                        if (updateError) throw updateError;
                        versionId = updatedVersion.id;
                    } else {
                        const { data: insertedVersion, error: insertError } = await supabase
                            .from('tariff_versions')
                            .insert(payload)
                            .select()
                            .single();
                        if (insertError) throw insertError;
                        versionId = insertedVersion.id;
                    }
            }

            if (!versionId) throw new Error("No version ID");

            // 2. Handle Rates — insert new FIRST, then delete old (prevents data loss on insert failure)
            const ratesPayload = data.rates.map(r => ({
                id: crypto.randomUUID(),
                tariff_version_id: versionId,
                item_type: r.item_type,
                period: r.period,
                price: r.price,
                price_formula: r.price_formula,
                unit: r.unit,
                confidence_score: r.confidence_score,
                contract_duration: r.contract_duration ?? null,
                valid_from: sanitizeDate(r.valid_from),
                valid_to: sanitizeDate(r.valid_to),
            }));

            // Collect old rate IDs before inserting new ones
            const { data: oldRates } = await supabase
                .from('tariff_rates')
                .select('id')
                .eq('tariff_version_id', versionId);
            const oldRateIds = (oldRates || []).map(r => r.id);

            if (ratesPayload.length > 0) {
                const { error: rError } = await supabase
                    .from('tariff_rates')
                    .insert(ratesPayload);
                if (rError) throw rError;
            }

            // Delete old rates only after new ones are confirmed inserted
            if (oldRateIds.length > 0) {
                const { error: delRatesErr } = await supabase.from('tariff_rates').delete().in('id', oldRateIds);
                if (delRatesErr) throw new Error(`Error limpiando rates antiguos: ${delRatesErr.message}`);
            }

            // 3. Handle Schedules — same insert-before-delete pattern
            const toTimeString = (t: string) => {
                const parts = t.split(':');
                if (parts.length === 2) return `${t}:00`;
                return t;
            };
            const schedulesPayload = data.schedules.map(s => ({
                id: crypto.randomUUID(),
                tariff_version_id: versionId,
                month_mask: Array.from(s.month_mask),
                day_type_mask: Array.from(s.day_type_mask),
                start_hour: toTimeString(s.start_hour),
                end_hour: toTimeString(s.end_hour),
                period: s.period,
                context_calendar: s.context_calendar ?? null,
            }));

            const { data: oldSchedules } = await supabase
                .from('tariff_schedules')
                .select('id')
                .eq('tariff_version_id', versionId);
            const oldScheduleIds = (oldSchedules || []).map(s => s.id);

            if (schedulesPayload.length > 0) {
                const { error: sError } = await supabase
                    .from('tariff_schedules')
                    .insert(schedulesPayload);
                if (sError) throw sError;
            }

            if (oldScheduleIds.length > 0) {
                const { error: delSchedErr } = await supabase.from('tariff_schedules').delete().in('id', oldScheduleIds);
                if (delSchedErr) throw new Error(`Error limpiando horarios antiguos: ${delSchedErr.message}`);
            }

            toast({
                title: mode === 'create' ? "Tarifa Creada" : "Tarifa Actualizada",
                description: `La tarifa ${data.metadata.name} ha sido guardada correctamente.`,
            });

            await queryClient.invalidateQueries({ queryKey: ['tariff-versions'] });

            if (fromOCR) {
                onSave();
            } else {
                navigate('/admin/tariffs');
            }

        } catch (err: unknown) {
            console.error('Error al guardar tarifa:', err);
            toast({
                variant: 'destructive',
                title: "Error al guardar",
                description: getErrorMessage(err),
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Resumen y Confirmación</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontWeight: 500, marginBottom: '1rem', color: '#111827', margin: '0 0 1rem 0' }}>Datos Generales</h3>
                    <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <dt style={{ color: '#6b7280' }}>Nombre:</dt>
                            <dd style={{ fontWeight: 500 }}>{data.metadata.name}</dd>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <dt style={{ color: '#6b7280' }}>Modalidad:</dt>
                            <dd style={{ fontWeight: 500 }}>{data.metadata.is_indexed ? 'Indexado' : 'Fijo'}</dd>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <dt style={{ color: '#6b7280' }}>Vigencia:</dt>
                            <dd style={{ fontWeight: 500 }}>{data.metadata.valid_from}</dd>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <dt style={{ color: '#6b7280' }}>Comisión:</dt>
                            <dd style={{ fontWeight: 500 }}>
                                {data.metadata.commission_value > 0
                                    ? data.metadata.commission_type === 'percentage'
                                        ? `${data.metadata.commission_value}%`
                                        : `${data.metadata.commission_value}€`
                                    : 'Sin comisión'}
                            </dd>
                        </div>
                    </dl>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontWeight: 500, marginBottom: '1rem', color: '#111827', margin: '0 0 1rem 0' }}>Estado de Validación</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {isComplete ? (
                            <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
                        ) : (
                            <AlertTriangle size={20} style={{ color: '#eab308' }} />
                        )}
                        <span style={{ fontWeight: 500 }}>
                            {isComplete ? 'Completa' : 'Faltan datos obligatorios (Metadata o Precios)'}
                        </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                        {fromOCR
                            ? "La tarifa se guardará como borrador. Puedes activarla desde la tabla de tarifas seleccionándola."
                            : isComplete
                                ? "La tarifa está lista para ser activada y utilizada en recomendaciones."
                                : "Puedes guardar como borrador y terminar de editar más tarde."}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                {mode === 'edit' && (
                    <button
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={saving}
                        className="btn btn-secondary"
                        style={{ color: '#ef4444', borderColor: '#fca5a5', background: '#fef2f2' }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Eliminar Tarifa'}
                    </button>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Borrador'}
                    </button>
                    {!fromOCR && (
                        <button
                            className="btn btn-primary"
                            onClick={() => handleSave(true)}
                            disabled={saving || !isComplete}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : mode === 'edit' ? 'Actualizar Tarifa' : 'Publicar y Activar'}
                        </button>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="Eliminar tarifa"
                message="¿Estás seguro de que quieres eliminar esta tarifa? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteDialog(false)}
            />
        </div>
    );
}
