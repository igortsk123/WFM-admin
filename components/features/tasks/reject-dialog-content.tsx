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
}

export function RejectDialogContent({ onReject, onClose, isPending }: RejectDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const [reason, setReason] = useState("")
  const isValid = reason.trim().length >= 10

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
