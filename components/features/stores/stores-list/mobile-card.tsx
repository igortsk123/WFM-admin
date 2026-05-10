"use client"

import { memo } from "react"
import { useTranslations } from "next-intl"
import { MoreHorizontal } from "lucide-react"

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

/**
 * Полный адрес одной строкой (без дубликатов city).
 * Дедуп: LAMA-shape «г. <city>» → отдаём только address.
 */
function buildFullAddress(store: StoreWithStats): string {
  const city = store.city?.trim() ?? ""
  const address = store.address?.trim() ?? ""
  if (!address) return city
  if (!city) return address
  const stripped = address.replace(/^г\.\s*/i, "").trim()
  if (stripped.toLowerCase() === city.toLowerCase()) return address
  if (address.toLowerCase().startsWith(city.toLowerCase())) return address
  return `${city}, ${address}`
}

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
      subtitle={<span className="break-words">{buildFullAddress(store)}</span>}
      meta={
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            {t("columns.staff")}: {store.staff_count}
          </Badge>
          {store.tasks_today_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {t("columns.tasks_today")}: {store.tasks_today_count}
            </Badge>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-end">
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">{t("actions.more")}</span>
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
