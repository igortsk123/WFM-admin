"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ApproveDialogContentProps {
  onApprove: (comment?: string) => Promise<void>
  onClose: () => void
  isPending?: boolean
}

export function ApproveDialogContent({ onApprove, onClose, isPending }: ApproveDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const [comment, setComment] = useState("")

  async function handleSubmit() {
    await onApprove(comment.trim() || undefined)
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("approve_dialog_title")}</DialogTitle>
        <DialogDescription>{t("approve_dialog_desc")}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approve-comment">{t("approve_comment_label")}</Label>
          <Textarea
            id="approve-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("approve_comment_placeholder")}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button
          className="bg-success text-success-foreground hover:bg-success/90"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {t("approve_submit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
