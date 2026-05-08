"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

/**
 * Generic bulk-select dialog: header + optional description + select-control
 * + cancel/submit footer. Используется в employees-list (роль/магазин/зона)
 * и аналогичных bulk-операциях.
 *
 * children — слот для select-контрола (SingleSelectCombobox / MultiSelectCombobox /
 * Radio Group), реальная UI выбора варьируется. Диалог только обёртка.
 */
export interface BulkSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  cancelLabel: string
  submitLabel: string
  /** disabled-условие сверх loading — например когда value пустой. */
  submitDisabled?: boolean
  /** "destructive" для опасных bulk-операций (revoke / delete и т.п.). */
  submitVariant?: "default" | "destructive"
  loading: boolean
  onConfirm: () => void
  /** Контрол выбора (Combobox, RadioGroup, etc) — рендерится внутри тела. */
  children: React.ReactNode
}

export function BulkSelectDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  submitLabel,
  submitDisabled,
  submitVariant = "default",
  loading,
  onConfirm,
  children,
}: BulkSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {children}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitDisabled || loading}
            variant={submitVariant}
          >
            {loading ? <Spinner className="size-4 mr-2" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
