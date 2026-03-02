import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
    [
        "inline-flex items-center justify-center whitespace-nowrap rounded-md",
        "text-sm font-semibold tracking-[-0.01em]",
        "transition-all duration-150 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "gap-2",
    ].join(" "),
    {
        variants: {
            variant: {
                default:
                    "bg-[#2563eb] text-white shadow-sm hover:bg-[#1d4ed8] active:translate-y-px",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:translate-y-px",
                outline:
                    "border border-[#e2e8f0] bg-white text-[#64748b] shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)] hover:bg-[#f1f5f9] hover:text-[#0f172a]",
                secondary:
                    "bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]",
                ghost:
                    "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]",
                link:
                    "text-[#2563eb] underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-10 rounded-md px-6 text-base",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
