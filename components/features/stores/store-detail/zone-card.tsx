"use client"

import { useTranslations } from "next-intl"
import { LayoutGrid, Pencil, Trash2 } from "lucide-react"

import type { StoreZoneWithCounts } from "@/lib/api"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ─── Zone icon mapping ────────────────────────────────────────────────────────

function ZoneIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes("касс")) return <span className="text-lg">🏧</span>
  if (lower.includes("склад") || lower.includes("хран")) return <span className="text-lg">📦</span>
  if (lower.includes("кофе") || lower.includes("cafe")) return <span className="text-lg">☕</span>
  if (lower.includes("самокас") || lower.includes("self")) return <span className="text-lg">🤖</span>
  if (lower.includes("торг") || lower.includes("зал")) return <span className="text-lg">🛒</span>
  if (lower.includes("возврат")) return <span className="text-lg">↩️</span>
  return <LayoutGrid className="size-4 text-muted-foreground" />
}

interface ZoneCardProps {
  zone: StoreZoneWithCounts
  storeCode: string
  onEdit?: (zone: StoreZoneWithCounts) => void
  onDelete?: (zone: StoreZoneWithCounts) => void
}

export function ZoneCard({ zone, storeCode, onEdit, onDelete }: ZoneCardProps) {
  const t = useTranslations("screen.storeDetail")
  const canDelete = zone.tasks_today === 0

  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
          <ZoneIcon name={zone.name} />
        </span>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{zone.name}</span>
            {zone.is_global ? (
              <Badge variant="secondary" className="text-xs shrink-0">{t("zones.global_badge")}</Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-mono shrink-0">{t("zones.store_badge", { code: storeCode })}</Badge>
            )}
          </div>
          {zone.code && (
            <span className="text-xs text-muted-foreground font-mono">{zone.code}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-base font-semibold text-foreground">{zone.employees_count}</span>
            <span className="text-xs text-muted-foreground leading-tight">{t("zones.stat_employees")}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-base font-semibold text-foreground">{zone.tasks_today}</span>
            <span className="text-xs text-muted-foreground leading-tight">{t("zones.stat_tasks")}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-2">
            <span className="text-base font-semibold text-foreground">{zone.active_shifts_count}</span>
            <span className="text-xs text-muted-foreground leading-tight">{t("zones.stat_shifts")}</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onEdit?.(zone)}
          >
            <Pencil className="size-3" />
            {t("zones.edit")}
          </Button>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                    disabled={!canDelete}
                    onClick={() => canDelete && onDelete?.(zone)}
                  >
                    <Trash2 className="size-3" />
                    {t("zones.delete")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canDelete && (
                <TooltipContent side="top" className="max-w-48 text-center text-xs">
                  {t("zones.delete_disabled")}
                </TooltipContent>
              )}
            </UITooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
