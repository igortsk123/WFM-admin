"use client"

import { useTranslations } from "next-intl"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BulkActionBar as SharedBulkActionBar } from "@/components/shared/bulk-action-bar"

interface BulkActionBarProps {
  selectedCount: number
  onArchive: () => void
  onCancel: () => void
}

export function BulkActionBar({ selectedCount, onArchive, onCancel }: BulkActionBarProps) {
  const t = useTranslations("screen.stores")

  return (
    <SharedBulkActionBar
      variant="sticky"
      selectedCount={selectedCount}
      countLabel={t("bulk.selected", { count: selectedCount })}
      onClearSelection={onCancel}
      actions={
        <>
          <Button size="sm" variant="destructive" onClick={onArchive}>
            {t("bulk.archive")}
          </Button>
          <Button size="sm" variant="outline">
            {t("bulk.change_format")}
          </Button>
          <Button size="sm" variant="outline">
            <Download className="size-3.5 mr-1.5" />
            {t("bulk.export")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {t("bulk.cancel")}
          </Button>
        </>
      }
    />
  )
}
