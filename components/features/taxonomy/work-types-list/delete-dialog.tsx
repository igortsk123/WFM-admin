"use client"

import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

import type { WorkTypeWithCount } from "@/lib/api/taxonomy"
import type { TFn } from "./_shared"

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deletingWorkType: WorkTypeWithCount | null
  deleteError: string | null
  onConfirmDelete: () => Promise<void>
  onClearError: () => void
  t: TFn
  tCommon: TFn
}

export function WorkTypeDeleteDialog({
  open,
  onOpenChange,
  deletingWorkType,
  deleteError,
  onConfirmDelete,
  onClearError,
  t,
  tCommon,
}: DeleteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) onClearError()
      }}
    >
      <AlertDialogTrigger asChild>
        <span className="sr-only" />
      </AlertDialogTrigger>
      <ConfirmDialog
        title={t("dialogs.delete_confirm_title", {
          name: deletingWorkType?.name ?? "",
        })}
        message={
          deleteError ? deleteError : t("dialogs.delete_confirm_warning")
        }
        confirmLabel={
          deleteError ? tCommon("close") : t("dialogs.delete_confirm_action")
        }
        variant={deleteError ? "default" : "destructive"}
        onConfirm={
          deleteError
            ? async () => onOpenChange(false)
            : onConfirmDelete
        }
        onOpenChange={onOpenChange}
      />
    </AlertDialog>
  )
}
