"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface RejectDialogProps {
  open: boolean
  title: string
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function RejectDialog({ open, title, onConfirm, onClose }: RejectDialogProps) {
  const t = useTranslations("screen.subtasksModeration")
  const tc = useTranslations("common")
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (!open) setReason("")
  }, [open])

  const valid = reason.trim().length >= 10

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="text-sm font-medium text-foreground">
            {t("reject_reason_label")}
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reject_reason_placeholder")}
            className="min-h-[80px] resize-none"
            autoFocus
          />
          {!valid && reason.length > 0 && (
            <p className="text-xs text-destructive">{t("reject_reason_hint")}</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            variant="destructive"
            disabled={!valid}
            onClick={() => onConfirm(reason)}
          >
            {t("btn_reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
