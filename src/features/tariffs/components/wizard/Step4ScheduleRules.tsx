import { useState } from 'react';
import { TariffWizardState, TariffSchedule } from '@/types/tariff';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';

interface Step4Props {
    data: TariffWizardState;
    onChange?: (schedules: TariffSchedule[]) => void;
}

const DEFAULT_SCHEDULES: TariffSchedule[] = [
    { id: '1', tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [1, 2, 3, 4, 5], start_hour: '08:00', end_hour: '23:59', period: 'P1' }, // Workdays
    { id: '2', tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [6, 7], start_hour: '00:00', end_hour: '23:59', period: 'P2' }, // Weekends
];

export function Step4ScheduleRules({ data, onChange }: Step4Props) {
    const [mode, setMode] = useState<'template' | 'custom'>('template');
    const [localSchedules, setLocalSchedules] = useState<TariffSchedule[]>(
        data.schedules.length > 0 ? data.schedules : DEFAULT_SCHEDULES
    );

    const handleModeChange = (newMode: 'template' | 'custom') => {
        setMode(newMode);
        if (newMode === 'template') {
            // Reset to default
            setLocalSchedules(DEFAULT_SCHEDULES);
            onChange && onChange(DEFAULT_SCHEDULES);
        }
    };

    const addSchedule = () => {
        const newSchedule: TariffSchedule = {
            id: crypto.randomUUID(),
            tariff_version_id: '',
            month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            day_type_mask: [1, 2, 3, 4, 5],
            start_hour: '00:00',
            end_hour: '00:00',
            period: 'P1'
        };
        const updated = [...localSchedules, newSchedule];
        setLocalSchedules(updated);
        onChange && onChange(updated);
    };

    const removeSchedule = (id: string) => {
        const updated = localSchedules.filter(s => s.id !== id);
        setLocalSchedules(updated);
        onChange && onChange(updated);
    };

    const updateSchedule = <K extends keyof TariffSchedule>(id: string, field: K, value: TariffSchedule[K]) => {
        const updated = localSchedules.map(s => s.id === id ? { ...s, [field]: value } : s);
        setLocalSchedules(updated);
        onChange && onChange(updated);
    };

    const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' };
    const inputStyle = {
        fontSize: '0.875rem',
        border: '1px solid #d1d5db',
        borderRadius: '0.375rem',
        padding: '0.25rem 0.5rem',
        outline: 'none',
        height: '2rem'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Calendario y Horarios</h2>
                <div style={{ background: '#f3f4f6', padding: '0.25rem', borderRadius: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                    <button
                        onClick={() => handleModeChange('template')}
                        style={{
                            padding: '0.375rem 1rem',
                            fontSize: '0.875rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            background: mode === 'template' ? 'white' : 'transparent',
                            boxShadow: mode === 'template' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                            color: mode === 'template' ? '#2563eb' : '#6b7280',
                            fontWeight: mode === 'template' ? 500 : 400
                        }}
                    >
                        Plantilla (BOE)
                    </button>
                    <button
                        onClick={() => handleModeChange('custom')}
                        style={{
                            padding: '0.375rem 1rem',
                            fontSize: '0.875rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            background: mode === 'custom' ? 'white' : 'transparent',
                            boxShadow: mode === 'custom' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                            color: mode === 'custom' ? '#2563eb' : '#6b7280',
                            fontWeight: mode === 'custom' ? 500 : 400
                        }}
                    >
                        Personalizado
                    </button>
                </div>
            </div>

            {mode === 'template' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <div style={{ padding: '0.5rem', background: '#dbeafe', borderRadius: '9999px', height: 'fit-content' }}>
                            <AlertCircle size={24} style={{ color: '#2563eb' }} />
                        </div>
                        <div>
                            <h3 style={{ fontWeight: 600, color: '#1e3a8a', margin: 0 }}>Configuración Rápida</h3>
                            <p style={{ fontSize: '0.875rem', color: '#1e40af', marginTop: '0.25rem', margin: 0 }}>
                                Selecciona un tipo de horario predefinido o cambia a "Personalizado" para definir reglas específicas.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <button
                            onClick={() => {
                                const schedules: TariffSchedule[] = [
                                    { id: crypto.randomUUID(), tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [1, 2, 3, 4, 5, 6, 7], start_hour: '00:00', end_hour: '23:59', period: 'P1' }
                                ];
                                setLocalSchedules(schedules);
                                onChange && onChange(schedules);
                                setMode('custom');
                            }}
                            style={{ padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                        >
                            <div style={{ fontWeight: 600, color: '#111827' }}>24 Horas</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Un único periodo (P1) todo el día</div>
                        </button>

                        <button
                            onClick={() => {
                                const schedules: TariffSchedule[] = [
                                    // P1: 10-14, 18-22
                                    { id: crypto.randomUUID(), tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [1, 2, 3, 4, 5], start_hour: '10:00', end_hour: '13:59', period: 'P1' },
                                    { id: crypto.randomUUID(), tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [1, 2, 3, 4, 5], start_hour: '18:00', end_hour: '21:59', period: 'P1' },
                                    // P2: 08-10, 14-18, 22-24
                                    { id: crypto.randomUUID(), tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [1, 2, 3, 4, 5], start_hour: '08:00', end_hour: '09:59', period: 'P2' },
                                    { id: crypto.randomUUID(), tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [1, 2, 3, 4, 5], start_hour: '14:00', end_hour: '17:59', period: 'P2' },
                                    { id: crypto.randomUUID(), tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [1, 2, 3, 4, 5], start_hour: '22:00', end_hour: '23:59', period: 'P2' },
                                    // P3: 00-08, weekends
                                    { id: crypto.randomUUID(), tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [1, 2, 3, 4, 5], start_hour: '00:00', end_hour: '07:59', period: 'P3' },
                                    { id: crypto.randomUUID(), tariff_version_id: '', month_mask: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], day_type_mask: [6, 7], start_hour: '00:00', end_hour: '23:59', period: 'P3' },
                                ];
                                setLocalSchedules(schedules);
                                onChange && onChange(schedules);
                                setMode('custom');
                            }}
                            style={{ padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                        >
                            <div style={{ fontWeight: 600, color: '#111827' }}>Punta, Llano, Valle (2.0TD)</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Configuración estándar española</div>
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {localSchedules.map((schedule, index) => (
                        <div key={schedule.id || index} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                            <div style={{ width: '6rem' }}>
                                <label style={labelStyle}>Periodo</label>
                                <select
                                    style={{ ...inputStyle, width: '100%' }}
                                    value={schedule.period}
                                    onChange={(e) => updateSchedule(schedule.id, 'period', e.target.value)}
                                >
                                    <option value="P1">P1</option>
                                    <option value="P2">P2</option>
                                    <option value="P3">P3</option>
                                    <option value="P4">P4</option>
                                    <option value="P5">P5</option>
                                    <option value="P6">P6</option>
                                </select>
                            </div>

                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={labelStyle}>Días de la semana</label>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
                                        const dayNum = i + 1;
                                        const isSelected = schedule.day_type_mask.includes(dayNum);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                    const newMask = isSelected
                                                        ? schedule.day_type_mask.filter(d => d !== dayNum)
                                                        : [...schedule.day_type_mask, dayNum];
                                                    updateSchedule(schedule.id, 'day_type_mask', newMask);
                                                }}
                                                style={{
                                                    height: '2rem',
                                                    width: '2rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    border: isSelected ? '1px solid #2563eb' : '1px solid #d1d5db',
                                                    background: isSelected ? '#2563eb' : 'white',
                                                    color: isSelected ? 'white' : '#6b7280',
                                                    cursor: 'pointer',
                                                    transition: 'colors 0.1s'
                                                }}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                <div>
                                    <label style={labelStyle}>Inicio</label>
                                    <input
                                        type="time"
                                        style={{ ...inputStyle, width: '6rem' }}
                                        value={schedule.start_hour.substring(0, 5)}
                                        onChange={(e) => updateSchedule(schedule.id, 'start_hour', e.target.value)}
                                    />
                                </div>
                                <span style={{ marginBottom: '0.5rem', color: '#9ca3af' }}>-</span>
                                <div>
                                    <label style={labelStyle}>Fin</label>
                                    <input
                                        type="time"
                                        style={{ ...inputStyle, width: '6rem' }}
                                        value={schedule.end_hour.substring(0, 5)}
                                        onChange={(e) => updateSchedule(schedule.id, 'end_hour', e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => removeSchedule(schedule.id)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '0.5rem',
                                    borderRadius: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addSchedule}
                        style={{
                            width: '100%',
                            border: '2px dashed #d1d5db',
                            borderRadius: '0.5rem',
                            padding: '1.5rem',
                            color: '#6b7280',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            background: 'transparent',
                            transition: 'color 0.2s, border-color 0.2s'
                        }}
                    >
                        <Plus size={16} /> Añadir Regla Horaria
                    </button>
                </div>
            )}
        </div>
    );
}
