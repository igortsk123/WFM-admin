"use client"

import { memo } from "react"
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
import { EntityMobileCard } from "@/components/shared/entity-mobile-card"
import { cn } from "@/lib/utils"

import { formatLamaSync } from "./_shared"

interface MobileCardProps {
  store: StoreWithStats
  /**
   * Click target. The parent `ResponsiveDataTable` already calls `onRowClick`
   * for the whole card, so this is used only inside the dropdown's
   * "Open" item to keep parity with desktop. Callback receives the row store.
   */
  onClick: (store: StoreWithStats) => void
  onArchive: (store: StoreWithStats) => void
  onSync: (store: StoreWithStats) => void
  onEdit: (store: StoreWithStats) => void
}

export const MobileCard = memo(function MobileCard({ store, onClick, onArchive, onSync, onEdit }: MobileCardProps) {
  const t = useTranslations("screen.stores")
  const { label: lamaLabel, level: lamaLevel } = formatLamaSync(store.lama_synced_at)

  return (
    <EntityMobileCard
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-base leading-snug">{store.name}</span>
          <Badge
            variant="secondary"
            className="font-mono text-xs uppercase px-1.5 py-0 align-middle"
          >
            {store.external_code}
          </Badge>
        </div>
      }
      subtitle={
        <span className="truncate">
          {store.address}, {store.city}
        </span>
      }
      status={
        <Badge
          variant={store.archived ? "secondary" : "outline"}
          className={cn(
            "text-[10px]",
            !store.archived && "text-success border-success/30 bg-success/10",
          )}
        >
          {store.archived ? t("status.archived") : t("status.active")}
        </Badge>
      }
      meta={
        <div className="flex flex-wrap gap-1">
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
      }
      footer={
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
                <DropdownMenuItem onClick={() => onClick(store)}>{t("actions.open")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(store)}>{t("actions.edit")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSync(store)}>
                  {t("actions.force_sync_lama")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onArchive(store)}
                  className="text-destructive focus:text-destructive"
                >
                  {t("actions.archive")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      }
    />
  )
})
