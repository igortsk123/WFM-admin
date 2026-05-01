"use client"

import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/**
 * Compound pattern — caller owns Root + Trigger.
 * This component = AlertDialog Content only.
 *
 * Usage:
 *   <AlertDialog open={open} onOpenChange={setOpen}>
 *     <AlertDialogTrigger asChild><Button>Delete</Button></AlertDialogTrigger>
 *     <ConfirmDialog
 *       title={t('screen.deleteConfirm.title')}
 *       message={t('screen.deleteConfirm.message')}
 *       confirmLabel={t('common.delete')}
 *       variant="destructive"
 *       onConfirm={handleDelete}
 *       onOpenChange={setOpen}
 *     />
 *   </AlertDialog>
 */

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  onConfirm: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  async function handleConfirm() {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{message}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {cancelLabel ?? "Отмена"}
        </Button>
        <Button variant={variant} onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
