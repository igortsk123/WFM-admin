"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { ArchiveReason } from "@/lib/types"

interface ArchiveDialogContentProps {
  onArchive: (reason: ArchiveReason, comment?: string) => Promise<void>
  onClose: () => void
  isPending?: boolean
}

const ARCHIVE_REASONS: ArchiveReason[] = ["CLOSED", "DUPLICATE", "WRONG_DATA", "OBSOLETE", "OTHER"]

export function ArchiveDialogContent({ onArchive, onClose, isPending }: ArchiveDialogContentProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const [reason, setReason] = useState<ArchiveReason>("CLOSED")
  const [comment, setComment] = useState("")

  const REASON_LABELS: Record<ArchiveReason, string> = {
    CLOSED: t("archive_reason_closed"),
    DUPLICATE: t("archive_reason_duplicate"),
    WRONG_DATA: t("archive_reason_wrong_data"),
    OBSOLETE: t("archive_reason_obsolete"),
    OTHER: t("archive_reason_other"),
  }

  async function handleSubmit() {
    await onArchive(reason, comment.trim() || undefined)
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("archive_dialog_title")}</DialogTitle>
        <DialogDescription>{t("archive_dialog_desc")}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-2">
          <Label>{t("archive_reason_label")}</Label>
          <RadioGroup
            value={reason}
            onValueChange={(v) => setReason(v as ArchiveReason)}
            className="flex flex-col gap-2"
          >
            {ARCHIVE_REASONS.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={r} id={`archive-reason-${r}`} />
                <Label htmlFor={`archive-reason-${r}`} className="font-normal cursor-pointer">
                  {REASON_LABELS[r]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="archive-comment">{t("archive_comment_label")}</Label>
          <Textarea
            id="archive-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("archive_comment_placeholder")}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
        <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
          {t("archive_submit")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
