import { DetectedTariff } from '@/types/tariff';
import { Save, ArrowRight, Trash2, CheckSquare, Square, Plus, FileText, Loader2 } from 'lucide-react';
import { useTariffCandidates } from '../../hooks/useTariffCandidates';
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '1rem',
        overflowY: 'auto' as const,
        maxHeight: '600px',
        paddingRight: '0.5rem',
    },
    candidateCard: (isSelected: boolean) => ({
        border: `1px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: '0.5rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1rem',
        transition: 'all 0.2s',
        position: 'relative' as const,
        background: 'white',
        boxShadow: isSelected ? '0 0 0 1px #bfdbfe' : '0 1px 3px rgba(0,0,0,0.05)',
        cursor: 'pointer',
    }),
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardTitleBlock: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    checkbox: (isSelected: boolean) => ({
        color: isSelected ? '#2563eb' : '#9ca3af',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
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
    },
    detailsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        fontSize: '0.75rem',
        color: '#4b5563',
        background: '#f9fafb',
        padding: '0.5rem',
        borderRadius: '0.25rem',
    },
    detailLabel: {
        color: '#9ca3af',
        display: 'block',
    },
    detailValue: {
        fontWeight: 500,
    },
    configureBtn: {
        marginTop: 'auto',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.25rem',
    },
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
    },
    emptyState: {
        textAlign: 'center' as const,
        padding: '2.5rem',
        color: '#6b7280',
    }
};

export function Step2Candidates({ candidates, onAddDocument, onEdit, onRemove, onUpdateCandidates }: Step2CandidatesProps) {
    const {
        selectedIds,
        processing,
        toggleSelection,
        handleBulkSave
    } = useTariffCandidates(candidates, onUpdateCandidates);

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
            {/* Left Column: List */}
            <div style={STYLES.columnLeft}>
                <div style={STYLES.header}>
                    <h2 style={STYLES.headerTitle}>Tarifas Detectadas</h2>
                    <button onClick={onAddDocument} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}>
                        <Plus size={16} style={{ marginRight: '0.25rem' }} /> Añadir Otro Documento
                    </button>
                </div>

                <div style={STYLES.candidateList}>
                    {candidates.map((c) => {
                        const isSelected = selectedIds.has(c.id);

                        return (
                            <div key={c.id} style={STYLES.candidateCard(isSelected)}>

                                <div style={STYLES.cardHeader}>
                                    <div style={STYLES.cardTitleBlock}>
                                        <button onClick={() => toggleSelection(c.id)} style={STYLES.checkbox(isSelected)}>
                                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </button>
                                        <div>
                                            <h3 style={{ fontWeight: 500, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={c.tariff_name}>
                                                {c.tariff_name || 'Sin Nombre'}
                                            </h3>
                                            <div style={STYLES.fileName}>
                                                <FileText size={10} style={{ marginRight: '0.25rem' }} /> {c.fileName}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => onRemove(c.id)} style={STYLES.deleteBtn} className="hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div style={STYLES.detailsGrid}>
                                    <div>
                                        <span style={STYLES.detailLabel}>Comercializadora</span>
                                        <span style={STYLES.detailValue}>{c.supplier_name || '-'}</span>
                                    </div>
                                    <div>
                                        <span style={STYLES.detailLabel}>Peaje</span>
                                        <span style={STYLES.detailValue}>{c.tariff_structure || '-'}</span>
                                    </div>
                                    <div>
                                        <span style={STYLES.detailLabel}>Tipo</span>
                                        <span style={{ ...STYLES.detailValue, color: c.supply_type === 'gas' ? '#ea580c' : '#2563eb' }}>
                                            {c.supply_type === 'gas' ? '🔥 Gas' : '⚡ Electricidad'}
                                        </span>
                                    </div>
                                    {(() => {
                                        const durations = new Set<number>();
                                        if (c.contract_duration != null) durations.add(c.contract_duration);
                                        c.price_sets?.forEach(set => {
                                            if (set.contract_duration != null) durations.add(set.contract_duration);
                                        });

                                        if (durations.size > 0) {
                                            return (
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <span style={STYLES.detailLabel}>Duración del contrato</span>
                                                    <span style={{ color: '#16a34a', fontWeight: 500 }}>
                                                        {Array.from(durations).sort((a, b) => a - b).map(d => `${d} meses`).join(', ')}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {(() => {
                                        const validities = new Set<string>();
                                        c.price_sets?.forEach(set => {
                                            if (set.valid_from || set.valid_to) {
                                                const from = set.valid_from ? new Date(set.valid_from).toLocaleDateString() : 'Siempre';
                                                const to = set.valid_to ? new Date(set.valid_to).toLocaleDateString() : 'Siempre';

                                                if (set.valid_from || set.valid_to) {
                                                    validities.add(`${from} al ${to}`);
                                                }
                                            }
                                        });

                                        if (validities.size > 0) {
                                            return (
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <span style={STYLES.detailLabel}>Periodos de vigencia</span>
                                                    <div style={{ color: '#7c3aed', fontWeight: 500, display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                        {Array.from(validities).map((v, i) => (
                                                            <span key={i} style={{ fontSize: '0.7rem' }}>• {v}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                <button
                                    onClick={() => onEdit(c)}
                                    className="btn btn-secondary"
                                    style={STYLES.configureBtn}
                                >
                                    Configurar <ArrowRight size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {selectedIds.size > 0 && (
                    <div style={STYLES.bulkActions}>
                        <span style={{ fontWeight: 500, color: '#374151', fontSize: '1rem' }}>{selectedIds.size} tarifas seleccionadas listas para guardar</span>
                        <button
                            onClick={handleBulkSave}
                            disabled={processing}
                            className="btn btn-primary"
                        >
                            {processing ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} /> : <Save size={16} style={{ marginRight: '0.5rem' }} />}
                            Guardar {selectedIds.size} como Borradores
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
