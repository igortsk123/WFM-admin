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

  return (
    <div className="sticky top-0 z-20 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 md:gap-4">
      <span className="text-sm font-medium text-foreground shrink-0">
        {t("selected", { count })}
      </span>

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
      <div className="flex sm:hidden items-center gap-2 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Действия <ChevronUp className="ml-1 size-3.5" />
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
        <p className="text-xs text-muted-foreground w-full sm:w-auto sm:ml-auto">
          {t("archive_hint")}
        </p>
      )}
    </div>
  )
}
