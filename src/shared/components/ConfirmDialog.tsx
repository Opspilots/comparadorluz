import { AlertTriangle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning'
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const colors = variant === 'danger'
        ? "bg-red-50 text-red-500"
        : "bg-amber-50 text-amber-500"

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader className="flex flex-row items-center gap-3 space-y-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors}`}>
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogDescription className="py-2">
                    {message}
                </DialogDescription>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button variant={variant === 'danger' ? 'destructive' : 'default'} onClick={onConfirm} className={variant === 'warning' ? "bg-amber-500 hover:bg-amber-600 outline-none text-white" : ""}>
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
