
import * as React from "react"

import { cn } from "@/shared/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-9 w-full rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#0f172a] tracking-[-0.01em] placeholder:text-[#94a3b8] shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)] transition-all duration-150 hover:border-[#cbd5e1] focus-visible:outline-none focus-visible:border-[#2563eb] focus-visible:ring-[3px] focus-visible:ring-[rgb(37_99_235_/_0.12)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#f8fafc] file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
