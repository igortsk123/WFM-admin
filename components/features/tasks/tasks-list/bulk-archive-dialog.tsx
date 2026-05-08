"use client"

import { useTranslations } from "next-intl"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { BulkSelectDialog } from "@/components/shared/bulk-select-dialog"
import type { ArchiveReason } from "@/lib/types"

import { ARCHIVE_REASONS } from "./_shared"

interface BulkArchiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  reason: ArchiveReason
  onReasonChange: (reason: ArchiveReason) => void
  loading: boolean
  onConfirm: () => void
}

export function BulkArchiveDialog({
  open,
  onOpenChange,
  count,
  reason,
  onReasonChange,
  loading,
  onConfirm,
}: BulkArchiveDialogProps) {
  const tBulk = useTranslations("screen.tasks.bulk")
  const tCommon = useTranslations("common")
  const tArchive = useTranslations("task.archive_reason")

  return (
    <BulkSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tBulk("dialog_archive_title")}
      description={tBulk("dialog_archive_desc", { count })}
      cancelLabel={tCommon("cancel")}
      submitLabel={tCommon("archive")}
      submitVariant="destructive"
      loading={loading}
      onConfirm={onConfirm}
    >
      <RadioGroup
        value={reason}
        onValueChange={(v) => onReasonChange(v as ArchiveReason)}
        className="flex flex-col gap-2 mt-2"
      >
        {ARCHIVE_REASONS.map((r) => (
          <div key={r} className="flex items-center gap-2">
            <RadioGroupItem value={r} id={`archive-reason-${r}`} />
            <Label htmlFor={`archive-reason-${r}`} className="font-normal cursor-pointer">
              {tArchive(r as Parameters<typeof tArchive>[0])}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </BulkSelectDialog>
  )
}
