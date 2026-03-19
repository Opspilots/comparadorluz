import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { DetectedTariff } from '@/types/tariff';
import {
    Save, ArrowRight, Trash2, CheckSquare, Square, Plus, FileText,
    Loader2, Zap, Flame, SlidersHorizontal, RefreshCw, CheckCircle, X, Search, Upload
} from 'lucide-react';
import { useTariffCandidates } from '../../hooks/useTariffCandidates';

interface ExistingTariffVersion {
    id: string;
    tariff_name: string;
    valid_from: string;
    supplier: { id: string; name: string } | null;
    structure: { id: string; code: string } | null;
}

interface Step2CandidatesProps {
    candidates: DetectedTariff[];
    onAddDocument: () => void;
    onEdit: (candidate: DetectedTariff) => void;
    onRemove: (id: string) => void;
    onUpdateCandidates: (newCandidates: DetectedTariff[]) => void;
}

const STYLES = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1.5rem',
        minHeight: '500px',
    },
    columnLeft: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1rem',
        height: '100%',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
    },
    headerTitle: {
        fontSize: '1.125rem',
        fontWeight: 600,
        color: '#111827',
    },
    candidateList: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '0.75rem',
        overflowY: 'auto' as const,
        maxHeight: '600px',
        paddingRight: '0.5rem',
    },
    candidateCard: (isSelected: boolean, isMatch: boolean) => ({
        border: `1px solid ${isSelected ? '#3b82f6' : isMatch ? '#bbf7d0' : '#e5e7eb'}`,
        borderRadius: '0.5rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'row' as const,
        alignItems: 'center',
        gap: '1rem',
        transition: 'all 0.2s',
        position: 'relative' as const,
        background: isMatch ? '#f0fdf4' : 'white',
        boxShadow: isSelected ? '0 0 0 1px #bfdbfe' : '0 1px 3px rgba(0,0,0,0.05)',
        cursor: 'pointer',
    }),
    checkbox: (isSelected: boolean) => ({
        color: isSelected ? '#2563eb' : '#9ca3af',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        flexShrink: 0,
    }),
    fileName: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '0.125rem',
    },
    deleteBtn: {
        color: '#d1d5db',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        transition: 'color 0.2s',
        flexShrink: 0,
    },
    detailChip: (color?: string) => ({
        background: color ? `${color}18` : '#f3f4f6',
        color: color || '#374151',
        padding: '0.125rem 0.5rem',
        borderRadius: '9999px',
        fontWeight: 500,
        fontSize: '0.7rem',
        border: `1px solid ${color ? `${color}33` : '#e5e7eb'}`,
        whiteSpace: 'nowrap' as const,
    }),
    bulkActions: {
        position: 'sticky' as const,
        bottom: 0,
        background: 'white',
        padding: '1rem',
        border: '1px solid #dbeafe',
        borderRadius: '0.5rem',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '1rem',
        zIndex: 10,
        gap: '0.75rem',
        flexWrap: 'wrap' as const,
    },
    emptyState: {
        textAlign: 'center' as const,
        padding: '2.5rem',
        color: '#6b7280',
    }
};

const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function findAutoMatch(candidate: DetectedTariff, versions: ExistingTariffVersion[]): ExistingTariffVersion | undefined {
    if (!candidate.tariff_name || !candidate.tariff_structure) return undefined;
    return versions.find(v => {
        const nameMatch = norm(v.tariff_name) === norm(candidate.tariff_name || '');
        const structureMatch = v.structure?.code === candidate.tariff_structure;
        const supplierName = v.supplier?.name || '';
        const candidateSupplier = candidate.supplier_name || '';
        const supplierMatch =
            norm(supplierName).includes(norm(candidateSupplier)) ||
            norm(candidateSupplier).includes(norm(supplierName));
        return nameMatch && structureMatch && supplierMatch;
    });
}

function ReplaceDialog({
    candidate,
    existingVersions,
    onReplace,
    onClose,
}: {
    candidate: DetectedTariff;
    existingVersions: ExistingTariffVersion[];
    onReplace: (version: ExistingTariffVersion) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');

    // Filter by same supplier (normalized)
    const supplierNorm = norm(candidate.supplier_name || '');
    const sameSupplierVersions = existingVersions.filter(v => {
        if (!supplierNorm) return true;
        const vSupplier = norm(v.supplier?.name || '');
        return vSupplier.includes(supplierNorm) || supplierNorm.includes(vSupplier);
    });

    const filtered = sameSupplierVersions.filter(v =>
        search === '' ||
        norm(v.tariff_name).includes(norm(search)) ||
        (v.structure?.code || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
                width: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#111827', margin: 0 }}>
                            Reemplazar con tarifa vigente
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                            Selecciona la tarifa de <strong>{candidate.supplier_name || 'este proveedor'}</strong> a la que pertenece este documento
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Candidate info */}
                <div style={{
                    background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.375rem',
                    padding: '0.625rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#78350f'
                }}>
                    Detectado como: <strong>"{candidate.tariff_name || 'Sin nombre'}"</strong> · {candidate.tariff_structure || '—'}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '0.625rem' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Buscar tarifa..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                        style={{
                            width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem',
                            border: '1px solid #e5e7eb', borderRadius: '0.375rem',
                            fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem', minHeight: '150px' }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', padding: '2rem 1rem' }}>
                            {sameSupplierVersions.length === 0
                                ? `No hay tarifas vigentes de ${candidate.supplier_name || 'este proveedor'}`
                                : 'No hay resultados para la búsqueda'
                            }
                        </div>
                    ) : filtered.map(v => (
                        <button
                            key={v.id}
                            onClick={() => onReplace(v)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb',
                                borderRadius: '0.375rem', background: 'white', cursor: 'pointer',
                                textAlign: 'left', transition: 'all 0.15s', width: '100%',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{v.tariff_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                                    {v.supplier?.name} · <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.structure?.code}</span> · desde {new Date(v.valid_from).toLocaleDateString('es-ES')}
                                </div>
                            </div>
                            <ArrowRight size={14} style={{ color: '#9ca3af', flexShrink: 0, marginLeft: '0.5rem' }} />
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem', background: '#f3f4f6', border: 'none',
                            borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151'
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

export function Step2Candidates({ candidates, onAddDocument, onEdit, onRemove, onUpdateCandidates }: Step2CandidatesProps) {
    const {
        selectedIds,
        processing,
        toggleSelection,
        handleBulkSave,
        quickUpdate,
        bulkUpdate,
    } = useTariffCandidates(candidates, onUpdateCandidates);

    const [supplyTypeFilter, setSupplyTypeFilter] = useState<'all' | 'electricity' | 'gas'>('all');
    const [structureFilter, setStructureFilter] = useState<string>('all');
    const [existingVersions, setExistingVersions] = useState<ExistingTariffVersion[]>([]);
    const [manualMatches, setManualMatches] = useState<Map<string, ExistingTariffVersion>>(new Map());
    const [replaceDialog, setReplaceDialog] = useState<DetectedTariff | null>(null);
    const [quickUpdating, setQuickUpdating] = useState<Set<string>>(new Set());

    // Load active tariff versions for match detection
    useEffect(() => {
        supabase
            .from('tariff_versions')
            .select('id, tariff_name, valid_from, supplier:suppliers(id, name), structure:tariff_structures(id, code)')
            .eq('is_active', true)
            .then(({ data }) => {
                if (data) setExistingVersions(data as unknown as ExistingTariffVersion[]);
            });
    }, []);

    const getEffectiveMatch = (candidate: DetectedTariff): ExistingTariffVersion | undefined => {
        return manualMatches.get(candidate.id) || findAutoMatch(candidate, existingVersions);
    };

    const handleReplace = (candidate: DetectedTariff, version: ExistingTariffVersion) => {
        setManualMatches(prev => new Map(prev).set(candidate.id, version));
        // Update candidate metadata to reflect the chosen tariff
        onUpdateCandidates(candidates.map(c => {
            if (c.id !== candidate.id) return c;
            return {
                ...c,
                tariff_name: version.tariff_name,
                tariff_structure: version.structure?.code,
                supplier_name: version.supplier?.name,
            };
        }));
        setReplaceDialog(null);
    };

    const handleQuickUpdate = async (candidate: DetectedTariff) => {
        const match = getEffectiveMatch(candidate);
        if (!match) return;
        setQuickUpdating(prev => new Set(prev).add(candidate.id));
        await quickUpdate(candidate, match.id);
        setQuickUpdating(prev => {
            const next = new Set(prev);
            next.delete(candidate.id);
            return next;
        });
    };

    const handleBulkUpdate = async () => {
        const pairs = candidates
            .filter(c => selectedIds.has(c.id))
            .flatMap(c => {
                const match = getEffectiveMatch(c);
                return match ? [{ candidate: c, existingVersionId: match.id }] : [];
            });
        await bulkUpdate(pairs);
    };

    const handleBulkSaveUnmatched = () => {
        const unmatchedIds = new Set(
            candidates
                .filter(c => selectedIds.has(c.id) && !getEffectiveMatch(c))
                .map(c => c.id)
        );
        handleBulkSave(unmatchedIds);
    };

    // Compute unique peajes from all candidates
    const uniqueStructures = [...new Set(candidates.map(c => c.tariff_structure).filter(Boolean))] as string[];

    const filteredCandidates = candidates.filter(c => {
        if (supplyTypeFilter !== 'all' && c.supply_type !== supplyTypeFilter) return false;
        if (structureFilter !== 'all' && c.tariff_structure !== structureFilter) return false;
        return true;
    });

    // Bulk action stats
    const selectedList = candidates.filter(c => selectedIds.has(c.id));
    const matchedSelected = selectedList.filter(c => getEffectiveMatch(c));
    const unmatchedSelected = selectedList.filter(c => !getEffectiveMatch(c));

    if (candidates.length === 0) {
        return (
            <div style={STYLES.emptyState}>
                <p style={{ marginBottom: '1rem' }}>No hay tarifas detectadas pendientes.</p>
                <button onClick={onAddDocument} className="btn btn-primary">
                    <Plus size={16} style={{ marginRight: '0.5rem' }} /> Añadir Documento
                </button>
            </div>
        );
    }

    return (
        <div style={STYLES.container} className="step2-container">
            {replaceDialog && (
                <ReplaceDialog
                    candidate={replaceDialog}
                    existingVersions={existingVersions}
                    onReplace={(version) => handleReplace(replaceDialog, version)}
                    onClose={() => setReplaceDialog(null)}
                />
            )}

            <div style={STYLES.columnLeft}>
                <div style={STYLES.header}>
                    <h2 style={STYLES.headerTitle}>
                        Tarifas Detectadas
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>
                            ({filteredCandidates.length} de {candidates.length})
                        </span>
                    </h2>
                    <button onClick={onAddDocument} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}>
                        <Plus size={16} style={{ marginRight: '0.25rem' }} /> Añadir Otro Documento
                    </button>
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                        <SlidersHorizontal size={14} /> Filtrar:
                    </div>

                    {/* Supply type filter */}
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                        {(['all', 'electricity', 'gas'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setSupplyTypeFilter(type)}
                                style={{
                                    padding: '0.25rem 0.625rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    border: '1px solid',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    ...(supplyTypeFilter === type
                                        ? type === 'electricity'
                                            ? { background: '#eff6ff', color: '#1d4ed8', borderColor: '#93c5fd' }
                                            : type === 'gas'
                                                ? { background: '#fff7ed', color: '#c2410c', borderColor: '#fdba74' }
                                                : { background: '#0f172a', color: 'white', borderColor: '#0f172a' }
                                        : { background: 'white', color: '#64748b', borderColor: '#e2e8f0' }),
                                }}
                            >
                                {type === 'electricity' && <Zap size={11} />}
                                {type === 'gas' && <Flame size={11} />}
                                {type === 'all' ? 'Todos' : type === 'electricity' ? 'Electricidad' : 'Gas'}
                            </button>
                        ))}
                    </div>

                    {/* Peaje filter */}
                    {uniqueStructures.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setStructureFilter('all')}
                                style={{
                                    padding: '0.25rem 0.625rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    border: '1px solid',
                                    cursor: 'pointer',
                                    ...(structureFilter === 'all'
                                        ? { background: '#0f172a', color: 'white', borderColor: '#0f172a' }
                                        : { background: 'white', color: '#64748b', borderColor: '#e2e8f0' }),
                                }}
                            >
                                Todos los peajes
                            </button>
                            {uniqueStructures.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStructureFilter(s)}
                                    style={{
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        border: '1px solid',
                                        cursor: 'pointer',
                                        fontFamily: 'monospace',
                                        ...(structureFilter === s
                                            ? { background: '#7c3aed', color: 'white', borderColor: '#7c3aed' }
                                            : { background: 'white', color: '#6b21a8', borderColor: '#ddd6fe' }),
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={STYLES.candidateList}>
                    {filteredCandidates.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                            No hay tarifas que coincidan con los filtros aplicados.
                        </div>
                    )}
                    {filteredCandidates.map((c) => {
                        const isSelected = selectedIds.has(c.id);
                        const isGas = c.supply_type === 'gas';
                        const match = getEffectiveMatch(c);
                        const isUpdating = quickUpdating.has(c.id);

                        // Collect all durations
                        const durations = new Set<number>();
                        if (c.contract_duration != null) durations.add(c.contract_duration);
                        c.price_sets?.forEach(set => { if (set.contract_duration != null) durations.add(set.contract_duration); });

                        // Count unique validity windows (same dates across different durations = 1 window)
                        const uniqueWindows = new Set<string>();
                        (c.price_sets || []).forEach(s => {
                            if (s.valid_from || s.valid_to) {
                                uniqueWindows.add(`${s.valid_from ?? ''}|${s.valid_to ?? ''}`);
                            }
                        });
                        const validityCount = uniqueWindows.size;

                        return (
                            <div key={c.id} style={STYLES.candidateCard(isSelected, !!match)}>
                                {/* Checkbox */}
                                <button onClick={() => toggleSelection(c.id)} style={STYLES.checkbox(isSelected)}>
                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>

                                {/* Supply type indicator */}
                                <div style={{
                                    width: '2rem',
                                    height: '2rem',
                                    borderRadius: '0.375rem',
                                    background: isGas ? '#fff7ed' : '#eff6ff',
                                    color: isGas ? '#ea580c' : '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    {isGas ? <Flame size={16} /> : <Zap size={16} />}
                                </div>

                                {/* Main info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <h3 style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }} title={c.tariff_name}>
                                            {c.tariff_name || 'Sin Nombre'}
                                        </h3>
                                        {c.tariff_structure && (
                                            <span style={STYLES.detailChip('#7c3aed')}>
                                                {c.tariff_structure}
                                            </span>
                                        )}
                                        {/* Match / new badge */}
                                        {match ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                background: '#dcfce7', color: '#15803d',
                                                padding: '0.125rem 0.5rem', borderRadius: '9999px',
                                                fontWeight: 600, fontSize: '0.68rem',
                                                border: '1px solid #bbf7d0',
                                            }}>
                                                <CheckCircle size={10} /> Actualizará tarifa vigente
                                            </span>
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                background: '#f3f4f6', color: '#6b7280',
                                                padding: '0.125rem 0.5rem', borderRadius: '9999px',
                                                fontWeight: 500, fontSize: '0.68rem',
                                                border: '1px solid #e5e7eb',
                                            }}>
                                                Nueva tarifa
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                        {c.supplier_name && (
                                            <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>{c.supplier_name}</span>
                                        )}
                                        <span style={STYLES.fileName}>
                                            <FileText size={10} style={{ marginRight: '0.2rem' }} /> {c.fileName}
                                        </span>
                                        {durations.size > 0 && (
                                            <span style={{ ...STYLES.detailChip('#16a34a'), fontSize: '0.7rem' }}>
                                                {Array.from(durations).sort((a, b) => a - b).map(d => `${d}m`).join(', ')}
                                            </span>
                                        )}
                                        {validityCount > 0 && (
                                            <span style={{ ...STYLES.detailChip('#7c3aed'), fontSize: '0.7rem' }}>
                                                {validityCount} vigencia{validityCount !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    {/* Match info */}
                                    {match && (
                                        <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '0.25rem' }}>
                                            Coincide con: <strong>{match.tariff_name}</strong> · desde {new Date(match.valid_from).toLocaleDateString('es-ES')}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                    {/* Quick update button — only when there's a match */}
                                    {match && (
                                        <button
                                            onClick={() => handleQuickUpdate(c)}
                                            disabled={isUpdating || processing}
                                            className="btn"
                                            title="Actualizar precios de la tarifa vigente directamente"
                                            style={{
                                                fontSize: '0.8rem', padding: '0.3rem 0.75rem',
                                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                background: '#16a34a', color: 'white',
                                                border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
                                                opacity: (isUpdating || processing) ? 0.6 : 1,
                                            }}
                                        >
                                            {isUpdating
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <Upload size={12} />
                                            }
                                            Actualizar
                                        </button>
                                    )}
                                    {/* Replace button */}
                                    <button
                                        onClick={() => setReplaceDialog(c)}
                                        disabled={processing}
                                        className="btn btn-secondary"
                                        title={match ? 'Cambiar a qué tarifa vigente se asigna' : 'Asignar a una tarifa vigente existente'}
                                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                        <RefreshCw size={12} />
                                        {match ? 'Reasignar' : 'Reemplazar'}
                                    </button>
                                    {/* Configure (full wizard) */}
                                    <button
                                        onClick={() => onEdit(c)}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                        Configurar <ArrowRight size={13} />
                                    </button>
                                    <button onClick={() => onRemove(c.id)} style={STYLES.deleteBtn} className="hover:text-red-500">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bulk actions */}
                {selectedIds.size > 0 && (
                    <div style={STYLES.bulkActions}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                            <span style={{ fontWeight: 500, color: '#374151', fontSize: '0.95rem' }}>
                                {selectedIds.size} tarifa{selectedIds.size !== 1 ? 's' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                            </span>
                            {(matchedSelected.length > 0 || unmatchedSelected.length > 0) && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {matchedSelected.length > 0 && (
                                        <span style={{ color: '#15803d' }}>{matchedSelected.length} actualizaci{matchedSelected.length !== 1 ? 'ones' : 'ón'}</span>
                                    )}
                                    {matchedSelected.length > 0 && unmatchedSelected.length > 0 && ' · '}
                                    {unmatchedSelected.length > 0 && (
                                        <span>{unmatchedSelected.length} nueva{unmatchedSelected.length !== 1 ? 's' : ''}</span>
                                    )}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {/* Publish updates button — only if there are matched candidates */}
                            {matchedSelected.length > 0 && (
                                <button
                                    onClick={handleBulkUpdate}
                                    disabled={processing}
                                    className="btn btn-primary"
                                    style={{ background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                                >
                                    {processing
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <Upload size={16} />
                                    }
                                    Publicar {matchedSelected.length} actualización{matchedSelected.length !== 1 ? 'es' : ''}
                                </button>
                            )}
                            {/* Save drafts button — only for unmatched (or all if no matches) */}
                            {unmatchedSelected.length > 0 && (
                                <button
                                    onClick={handleBulkSaveUnmatched}
                                    disabled={processing}
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                                >
                                    {processing
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <Save size={16} />
                                    }
                                    Guardar {unmatchedSelected.length} como borrador{unmatchedSelected.length !== 1 ? 'es' : ''}
                                </button>
                            )}
                            {/* If all selected have matches, no need for save-as-draft */}
                            {matchedSelected.length === 0 && unmatchedSelected.length === 0 && (
                                <button
                                    onClick={() => handleBulkSave()}
                                    disabled={processing}
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                                >
                                    {processing
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <Save size={16} />
                                    }
                                    Guardar {selectedIds.size} como borradores
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
