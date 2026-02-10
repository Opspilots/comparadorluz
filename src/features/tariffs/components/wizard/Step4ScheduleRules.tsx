import { useState } from 'react';
import { TariffWizardState, TariffSchedule } from '@/types/tariff';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
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

    const updateSchedule = (id: string, field: keyof TariffSchedule, value: any) => {
        const updated = localSchedules.map(s => s.id === id ? { ...s, [field]: value } : s);
        setLocalSchedules(updated);
        onChange && onChange(updated);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Calendario y Horarios</h2>
                <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                    <button
                        onClick={() => handleModeChange('template')}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${mode === 'template' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Plantilla (BOE)
                    </button>
                    <button
                        onClick={() => handleModeChange('custom')}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${mode === 'custom' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Personalizado
                    </button>
                </div>
            </div>

            {mode === 'template' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-6 flex gap-4">
                    <div className="p-2 bg-blue-100 rounded-full h-fit">
                        <AlertCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-blue-900">Configuración Estándar</h3>
                        <p className="text-sm text-blue-800 mt-1">
                            Se aplicará automáticamente el calendario oficial definido en el BOE para la tarifa seleccionada
                            (incluyendo festivos nacionales, fines de semana y temporadas).
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {localSchedules.map((schedule, index) => (
                        <Card key={schedule.id || index} className="p-4 flex gap-4 items-end flex-wrap">
                            <div className="w-24">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Periodo</label>
                                <select
                                    className="w-full text-sm border-gray-300 rounded focus:ring-blue-500"
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

                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Días de la semana</label>
                                <div className="flex gap-1">
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
                                                className={`h-8 w-8 rounded text-xs font-medium border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Inicio</label>
                                    <input
                                        type="time"
                                        className="text-sm border-gray-300 rounded w-24"
                                        value={schedule.start_hour.substring(0, 5)}
                                        onChange={(e) => updateSchedule(schedule.id, 'start_hour', e.target.value)}
                                    />
                                </div>
                                <span className="mb-2 text-gray-400">-</span>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Fin</label>
                                    <input
                                        type="time"
                                        className="text-sm border-gray-300 rounded w-24"
                                        value={schedule.end_hour.substring(0, 5)}
                                        onChange={(e) => updateSchedule(schedule.id, 'end_hour', e.target.value)}
                                    />
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSchedule(schedule.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </Card>
                    ))}

                    <Button variant="outline" onClick={addSchedule} className="w-full border-dashed border-2 py-6 text-gray-500 hover:border-blue-500 hover:text-blue-500">
                        <Plus className="mr-2 h-4 w-4" /> Añadir Regla Horaria
                    </Button>
                </div>
            )}
        </div>
    );
}
