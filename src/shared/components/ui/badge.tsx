
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-[0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-[#2563eb] text-white hover:bg-[#1d4ed8]",
                secondary:
                    "border-transparent bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]",
                destructive:
                    "border-transparent bg-[#fef2f2] text-[#991b1b] border-[#fecaca] hover:bg-[#fee2e2]",
                outline:
                    "border-[#e2e8f0] text-[#64748b] bg-transparent",
                success:
                    "border-transparent bg-[#ecfdf5] text-[#065f46] hover:bg-[#d1fae5]",
                warning:
                    "border-transparent bg-[#fffbeb] text-[#92400e] hover:bg-[#fef3c7]",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
