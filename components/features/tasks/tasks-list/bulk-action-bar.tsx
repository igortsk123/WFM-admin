"use client"

import { useTranslations } from "next-intl"
import { ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BulkActionBar as SharedBulkActionBar } from "@/components/shared/bulk-action-bar"

interface BulkActionBarProps {
  count: number
  onReassign: () => void
  onArchive: () => void
  onClear: () => void
  isArchiveTab: boolean
}

export function BulkActionBar({
  count,
  onReassign,
  onArchive,
  onClear,
  isArchiveTab,
}: BulkActionBarProps) {
  const t = useTranslations("screen.tasks.bulk")
  const tCommon = useTranslations("common")

  return (
    <SharedBulkActionBar
      variant="inline"
      // Preserve original sticky-top scrolling behavior + accent style
      className="sticky top-0 z-20 bg-primary/5 border-primary/20"
      selectedCount={count}
      countLabel={t("selected", { count })}
      actions={
        <>
          {/* Desktop: all buttons inline */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {!isArchiveTab && (
              <>
                <Button size="sm" variant="outline" onClick={onReassign}>
                  {t("reassign")}
                </Button>
                <Button size="sm" variant="outline" onClick={onArchive}>
                  {t("archive")}
                </Button>
              </>
            )}
            {isArchiveTab && (
              <Button size="sm" variant="outline" onClick={onReassign}>
                {t("reassign")}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClear}>
              {t("clear")}
            </Button>
          </div>

          {/* Mobile: actions dropdown + clear */}
          <div className="flex sm:hidden items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  {tCommon("actions")} <ChevronUp className="ml-1 size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isArchiveTab && (
                  <>
                    <DropdownMenuItem onClick={onReassign}>{t("reassign")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={onArchive}>{t("archive")}</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" onClick={onClear}>
              {t("clear")}
            </Button>
          </div>

          {!isArchiveTab && (
            <p className="text-xs text-muted-foreground w-full sm:w-auto sm:ml-2">
              {t("archive_hint")}
            </p>
          )}
        </>
      }
    />
  )
}
