import { TariffWizardState } from '@/types/tariff';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

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
    const { id } = useParams();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Validation status
    const hasRates = data.rates && data.rates.length > 0;
    const isComplete = data.metadata.supplier_id && data.metadata.name && data.metadata.tariff_structure_id && hasRates;

    const handleDelete = async () => {
        if (!id) return;

        setSaving(true);
        try {
            const { error } = await supabase.from('tariff_versions').delete().eq('id', id);
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
        setSaving(true);
        try {
            // Helper to prevent e.g '2026-02-29' crashing Supabase inserts
            const sanitizeDate = (d: any) => {
                if (!d) return null;
                const dateObj = new Date(d);
                return isNaN(dateObj.getTime()) ? null : d;
            };

            // 1. Prepare Payload
            const { data: user } = await supabase.auth.getUser();
            const { data: company } = await supabase.from('users').select('company_id').eq('id', user.user!.id).single();

            const { data: selectedStructure } = await supabase
                .from('tariff_structures')
                .select('code')
                .eq('id', data.metadata.tariff_structure_id)
                .single();

            const payload = {
                company_id: company?.company_id,
                supplier_id: data.metadata.supplier_id,
                tariff_structure_id: data.metadata.tariff_structure_id,
                tariff_name: data.metadata.name,
                tariff_code: data.metadata.code,
                tariff_type: selectedStructure?.code || '2.0TD',
                is_indexed: data.metadata.is_indexed,
                valid_from: sanitizeDate(data.metadata.valid_from),
                valid_to: sanitizeDate((data.metadata as any).valid_to),
                contract_duration: data.metadata.contract_duration,
                is_active: activate,
                completion_status: isComplete ? 'complete' : 'draft'
            };

            let versionId = id;

            if (mode === 'create' || id) {
                if (id) {
                    const { data: version, error: vError } = await supabase
                        .from('tariff_versions')
                        .update(payload)
                        .eq('id', id)
                        .select()
                        .single();
                    if (vError) throw vError;
                    versionId = version.id;
                } else {
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
            }

            if (!versionId) throw new Error("No version ID");

            // 2. Handle Rates 
            // Always delete existing rates for this version before inserting new ones to ensure clean state
            await supabase.from('tariff_rates').delete().eq('tariff_version_id', versionId);

            const ratesPayload = data.rates.map(r => ({
                id: crypto.randomUUID(), // Always new IDs for rates
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

            if (ratesPayload.length > 0) {
                const { error: rError } = await supabase
                    .from('tariff_rates')
                    .insert(ratesPayload);
                if (rError) throw rError;
            }

            // 3. Insert Schedules
            // Always delete existing schedules for this version before inserting new ones
            await supabase.from('tariff_schedules').delete().eq('tariff_version_id', versionId);

            const schedulesPayload = data.schedules.map(s => ({
                id: crypto.randomUUID(), // Always new IDs for schedules
                tariff_version_id: versionId,
                month_mask: s.month_mask,
                day_type_mask: s.day_type_mask,
                start_hour: s.start_hour.includes(':') && s.start_hour.split(':').length === 2 ? `${s.start_hour}:00` : s.start_hour,
                end_hour: s.end_hour.includes(':') && s.end_hour.split(':').length === 2 ? `${s.end_hour}:59` : s.end_hour,
                period: s.period,
                context_calendar: s.context_calendar
            }));

            if (schedulesPayload.length > 0) {
                const { error: sError } = await supabase
                    .from('tariff_schedules')
                    .insert(schedulesPayload);
                if (sError) throw sError;
            }

            toast({
                title: mode === 'create' ? "Tarifa Creada" : "Tarifa Actualizada",
                description: `La tarifa ${data.metadata.name} ha sido guardada correctamente.`,
            });

            if (fromOCR) {
                onSave();
            } else {
                navigate('/admin/tariffs');
            }

        } catch (err: unknown) {
            console.error(err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            toast({
                variant: 'destructive',
                title: "Error al guardar",
                description: errorMsg,
            });
        } finally {
            setSaving(false);
        }
    };

    if (!data) return null;

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
