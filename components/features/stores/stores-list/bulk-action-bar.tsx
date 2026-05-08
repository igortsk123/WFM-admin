"use client"

import { useTranslations } from "next-intl"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"

interface BulkActionBarProps {
  selectedCount: number
  onArchive: () => void
  onCancel: () => void
}

export function BulkActionBar({ selectedCount, onArchive, onCancel }: BulkActionBarProps) {
  const t = useTranslations("screen.stores")

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-popover px-4 py-3 shadow-lg">
        <p className="text-sm font-medium">
          {t("bulk.selected", { count: selectedCount })}
        </p>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>
    </div>
  )
}
