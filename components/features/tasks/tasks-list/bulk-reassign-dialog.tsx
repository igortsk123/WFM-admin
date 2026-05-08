"use client"

import { useTranslations } from "next-intl"

import { BulkSelectDialog } from "@/components/shared/bulk-select-dialog"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

interface Option {
  value: string
  label: string
}

interface BulkReassignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assigneeOptions: Option[]
  assigneeId: string
  onAssigneeChange: (id: string) => void
  loading: boolean
  onConfirm: () => void
}

export function BulkReassignDialog({
  open,
  onOpenChange,
  assigneeOptions,
  assigneeId,
  onAssigneeChange,
  loading,
  onConfirm,
}: BulkReassignDialogProps) {
  const tBulk = useTranslations("screen.tasks.bulk")
  const tCommon = useTranslations("common")

  return (
    <BulkSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tBulk("dialog_reassign_title")}
      cancelLabel={tCommon("cancel")}
      submitLabel={tCommon("confirm")}
      submitDisabled={!assigneeId}
      loading={loading}
      onConfirm={onConfirm}
    >
      <SingleSelectCombobox
        options={assigneeOptions}
        value={assigneeId}
        onValueChange={onAssigneeChange}
        placeholder={tBulk("assignee_placeholder")}
      />
    </BulkSelectDialog>
  )
}
