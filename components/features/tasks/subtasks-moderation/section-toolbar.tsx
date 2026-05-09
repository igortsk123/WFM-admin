"use client"

import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { FilterChip } from "@/components/shared/filter-chip"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"

import { ComboboxFilter } from "./combobox-filter"
import type { ComboOption } from "./_shared"

interface ActiveFilter {
  key: string
  label: string
  value: string
  onRemove: () => void
}

interface ToolbarSectionProps {
  search: string
  onSearchChange: (v: string) => void
  storeOptions: ComboOption[]
  workTypeOptions: ComboOption[]
  zoneOptions: ComboOption[]
  storeId: string
  setStoreId: (v: string) => void
  workTypeId: string
  setWorkTypeId: (v: string) => void
  zoneId: string
  setZoneId: (v: string) => void
  activeFilters: ActiveFilter[]
  onClearAll: () => void
}

export function ToolbarSection({
  search,
  onSearchChange,
  storeOptions,
  workTypeOptions,
  zoneOptions,
  storeId,
  setStoreId,
  workTypeId,
  setWorkTypeId,
  zoneId,
  setZoneId,
  activeFilters,
  onClearAll,
}: ToolbarSectionProps) {
  const t = useTranslations("screen.subtasksModeration")
  const tc = useTranslations("common")

  return (
    <div className="flex flex-col gap-3">
      {/* Search — always visible */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("search_placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm h-9"
        />
        {/* Desktop filters */}
        <div className="hidden md:flex items-center gap-2">
          <ComboboxFilter
            placeholder={t("filter_store")}
            options={storeOptions}
            value={storeId}
            onSelect={setStoreId}
          />
          <ComboboxFilter
            placeholder={t("filter_work_type")}
            options={workTypeOptions}
            value={workTypeId}
            onSelect={setWorkTypeId}
          />
          <ComboboxFilter
            placeholder={t("filter_zone")}
            options={zoneOptions}
            value={zoneId}
            onSelect={setZoneId}
          />
        </div>
      </div>

      {/* Mobile filter sheet */}
      <MobileFilterSheet
        activeCount={activeFilters.length}
        onClearAll={onClearAll}
        onApply={() => {}}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("filter_store")}</label>
            <ComboboxFilter
              placeholder={t("filter_store")}
              options={storeOptions}
              value={storeId}
              onSelect={setStoreId}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("filter_work_type")}</label>
            <ComboboxFilter
              placeholder={t("filter_work_type")}
              options={workTypeOptions}
              value={workTypeId}
              onSelect={setWorkTypeId}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("filter_zone")}</label>
            <ComboboxFilter
              placeholder={t("filter_zone")}
              options={zoneOptions}
              value={zoneId}
              onSelect={setZoneId}
              className="w-full"
            />
          </div>
        </div>
      </MobileFilterSheet>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              value={f.value}
              onRemove={f.onRemove}
            />
          ))}
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClearAll}
          >
            {tc("clearAll")}
          </button>
        </div>
      )}
    </div>
  )
}
