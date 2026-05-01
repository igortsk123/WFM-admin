"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface SubtaskRejectDialogContentProps {
  onReject: (reason: string) => Promise<void>
  onClose: () => void
  isPending?: boolean
}

export function SubtaskRejectDialogContent({ onReject, onClose, isPending }: SubtaskRejectDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const [reason, setReason] = useState("")
  const isValid = reason.trim().length >= 3

  async function handleSubmit() {
    if (!isValid) return
    await onReject(reason.trim())
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{t("subtask_reject_dialog_title")}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subtask-reject-reason">{t("subtask_reject_reason_label")}</Label>
          <Textarea
            id="subtask-reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("subtask_reject_reason_placeholder")}
            rows={3}
            className="resize-none"
            autoFocus
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button variant="destructive" onClick={handleSubmit} disabled={!isValid || isPending}>
          {tCommon("confirm")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
