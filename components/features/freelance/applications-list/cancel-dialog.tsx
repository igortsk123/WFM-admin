"use client"

import { AlertDialog } from "@/components/ui/alert-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function CancelDialog({ open, onOpenChange, onConfirm }: CancelDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <ConfirmDialog
        title="Отменить заявку?"
        message="Заявка будет переведена в статус «Отменена». Действие нельзя отменить."
        confirmLabel="Отменить заявку"
        variant="destructive"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />
    </AlertDialog>
  )
}
