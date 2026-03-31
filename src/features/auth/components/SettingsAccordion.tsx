import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'

interface SettingsAccordionProps {
    title: string
    description?: string
    icon?: React.ReactNode
    children: React.ReactNode
    defaultOpen?: boolean
}

/**
 * @deprecated Use Tabs-based layout in SettingsPage instead.
 * Kept for backward compatibility only.
 */
export function SettingsAccordion({ title, description, icon, children, defaultOpen = false }: SettingsAccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <Card className="overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 text-left bg-transparent border-none cursor-pointer transition-colors hover:bg-[#f8fafc]/50"
            >
                <div className="flex items-center gap-4">
                    {icon && (
                        <div className="p-2 bg-blue-50 text-[#2563eb] rounded-[8px]">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-[#0f172a] m-0">{title}</h3>
                        {description && <p className="text-sm text-[#64748b] mt-0.5 mb-0">{description}</p>}
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp size={20} className="text-[#94a3b8]" />
                ) : (
                    <ChevronDown size={20} className="text-[#94a3b8]" />
                )}
            </button>

            {isOpen && (
                <div className="px-6 pb-6 border-t border-[#f1f5f9]">
                    <div className="mt-6">
                        {children}
                    </div>
                </div>
            )}
        </Card>
    )
}
