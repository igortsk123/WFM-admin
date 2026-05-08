"use client"

import { useTranslations } from "next-intl"
import { AlertCircle, MoreHorizontal } from "lucide-react"

import type { StoreWithStats } from "@/lib/api/stores"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { formatLamaSync } from "./_shared"

interface MobileCardProps {
  store: StoreWithStats
  onClick: () => void
  onArchive: () => void
  onSync: () => void
  onEdit: () => void
}

export function MobileCard({ store, onClick, onArchive, onSync, onEdit }: MobileCardProps) {
  const t = useTranslations("screen.stores")
  const { label: lamaLabel, level: lamaLevel } = formatLamaSync(store.lama_synced_at)

  return (
    <div
      className="relative"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick()
      }}
    >
      {/* Status badge top-right */}
      <div className="absolute top-0 right-9">
        <Badge
          variant={store.archived ? "secondary" : "outline"}
          className={cn(
            "text-[10px]",
            !store.archived && "text-success border-success/30 bg-success/10",
          )}
        >
          {store.archived ? t("status.archived") : t("status.active")}
        </Badge>
      </div>

      {/* Title + code */}
      <div className="pr-16 mb-1">
        <span className="font-medium text-base leading-snug">{store.name}</span>
        <Badge
          variant="secondary"
          className="ml-2 font-mono text-xs uppercase px-1.5 py-0 align-middle"
        >
          {store.external_code}
        </Badge>
      </div>

      {/* Address */}
      <p className="text-xs text-muted-foreground mb-2 truncate">
        {store.address}, {store.city}
      </p>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        <Badge variant="secondary" className="text-xs">
          Сотр: {store.staff_count}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Откр. смен: {store.current_shifts_open_count}
        </Badge>
        {store.tasks_today_count > 0 && (
          <Badge variant="secondary" className="text-xs">
            Задач: {store.tasks_today_count}
          </Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs",
            lamaLevel === "fresh" && "text-success",
            lamaLevel === "stale" && "text-warning",
            lamaLevel === "critical" && "text-destructive flex items-center gap-1",
            lamaLevel === "never" && "text-muted-foreground",
          )}
        >
          {lamaLevel === "critical" && <AlertCircle className="size-3 inline mr-0.5" />}
          {lamaLabel}
        </span>
        {/* ⋮ menu — stop propagation */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Действия</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClick}>{t("actions.open")}</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>{t("actions.edit")}</DropdownMenuItem>
              <DropdownMenuItem onClick={onSync}>
                {t("actions.force_sync_lama")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onArchive}
                className="text-destructive focus:text-destructive"
              >
                {t("actions.archive")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
