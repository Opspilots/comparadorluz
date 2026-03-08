import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { IntegrationEvent } from '@/shared/types'
import { useIntegrationEvents } from '../lib/useIntegrations'

const EVENT_TYPE_COLORS: Record<string, string> = {
    'contract.activated': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'contract.rejected': 'bg-red-50 text-red-700 border-red-200',
    'contract.pending': 'bg-amber-50 text-amber-700 border-amber-200',
    'consumption.updated': 'bg-blue-50 text-blue-700 border-blue-200',
    'status.changed': 'bg-purple-50 text-purple-700 border-purple-200',
}

function eventColor(eventType: string): string {
    return EVENT_TYPE_COLORS[eventType] ?? 'bg-slate-50 text-slate-700 border-slate-200'
}

function PayloadRow({ event }: { event: IntegrationEvent }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <>
            <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(event.received_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </td>
                <td className="px-4 py-3">
                    <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${eventColor(event.event_type)}`}
                    >
                        {event.event_type}
                    </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                    {event.cups ?? '—'}
                </td>
                <td className="px-4 py-3">
                    {event.processed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle size={12} />
                            Procesado
                        </span>
                    ) : event.error ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <XCircle size={12} />
                            Error
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Clock size={12} />
                            Pendiente
                        </span>
                    )}
                </td>
                <td className="px-4 py-3">
                    <button
                        type="button"
                        onClick={() => setExpanded((e) => !e)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={expanded ? 'Ocultar payload' : 'Ver payload'}
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                </td>
            </tr>
            {expanded && (
                <tr className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={5} className="px-4 py-3">
                        {event.error && (
                            <p className="text-xs text-red-600 mb-2">
                                <span className="font-medium">Error: </span>{event.error}
                            </p>
                        )}
                        <pre className="text-[11px] text-slate-700 bg-slate-100 rounded-md p-3 overflow-x-auto font-mono max-h-48">
                            {JSON.stringify(event.payload, null, 2)}
                        </pre>
                    </td>
                </tr>
            )}
        </>
    )
}

interface IntegrationEventLogProps {
    companyId: string
    integrationId?: string
}

export function IntegrationEventLog({ companyId, integrationId }: IntegrationEventLogProps) {
    const { data: events, isLoading } = useIntegrationEvents(companyId, integrationId)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-2 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded-lg" />
                ))}
            </div>
        )
    }

    if (!events || events.length === 0) {
        return (
            <div className="text-center py-10 text-slate-400 text-sm">
                No hay eventos registrados todavía
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-[10px] border border-slate-200">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Fecha / Hora
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Tipo de evento
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            CUPS
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Estado
                        </th>
                        <th className="px-4 py-2.5 w-8" />
                    </tr>
                </thead>
                <tbody>
                    {events.map((event) => (
                        <PayloadRow key={event.id} event={event} />
                    ))}
                </tbody>
            </table>
        </div>
    )
}
