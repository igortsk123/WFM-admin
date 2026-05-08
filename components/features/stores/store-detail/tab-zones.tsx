"use client"

import { useTranslations } from "next-intl"
import { LayoutGrid, Plus } from "lucide-react"

import type { StoreDetail as StoreDetailData, StoreZoneWithCounts } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"

import { ZoneCard } from "./zone-card"

interface StoreZonesTabProps {
  data: StoreDetailData
  onAddZone: () => void
  onEditZone: (zone: StoreZoneWithCounts) => void
  onDeleteZone: (zoneId: number) => void
}

export function StoreZonesTab({
  data,
  onAddZone,
  onEditZone,
  onDeleteZone,
}: StoreZonesTabProps) {
  const t = useTranslations("screen.storeDetail")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {t("zones.title", { count: data.zones.length })}
        </h3>
        <Button size="sm" variant="outline" className="gap-2" onClick={onAddZone}>
          <Plus className="size-4" />
          {t("zones.add")}
        </Button>
      </div>
      {data.zones.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Зоны не настроены"
          description="Добавьте зоны для управления расписанием и задачами"
          action={{ label: t("zones.add"), onClick: onAddZone }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              storeCode={data.external_code}
              onEdit={zone.is_global ? undefined : onEditZone}
              onDelete={zone.is_global ? undefined : (z) => onDeleteZone(z.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
