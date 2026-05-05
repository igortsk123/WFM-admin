"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface RejectDialogContentProps {
  onReject: (reason: string) => Promise<void>
  onClose: () => void
  isPending?: boolean
  /** Имя первой невыполненной подзадачи — используется для автозаполнения. */
  incompleteSubtaskName?: string
}

export function RejectDialogContent({ onReject, onClose, isPending, incompleteSubtaskName }: RejectDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const initialReason = incompleteSubtaskName
    ? `НЕСДЕЛАНО: ${incompleteSubtaskName}`
    : ""
  const [reason, setReason] = useState(initialReason)
  const isValid = reason.trim().length >= 10

  const QUICK_REASONS = [
    t("reject_quick_wrong_photo"),
    t("reject_quick_not_done"),
    t("reject_quick_overdue"),
  ]

  async function handleSubmit() {
    if (!isValid) return
    await onReject(reason.trim())
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("reject_dialog_title")}</DialogTitle>
        <DialogDescription>{t("reject_dialog_desc")}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((q) => (
            <Button
              key={q}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setReason((prev) => (prev.trim() ? `${prev.trim()}\n${q}` : q))}
            >
              {q}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reject-reason">{t("reject_reason_label")}</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reject_reason_placeholder")}
            rows={4}
            className="resize-none"
          />
          {reason.length > 0 && !isValid && (
            <p className="text-xs text-destructive">
              Минимум 10 символов
            </p>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button
          variant="destructive"
          onClick={handleSubmit}
          disabled={!isValid || isPending}
        >
          {t("reject_submit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
