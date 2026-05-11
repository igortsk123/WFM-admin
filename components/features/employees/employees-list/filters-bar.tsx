"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"

import {
  FilterBar,
  FilterChipsRow,
  type FilterChipDescriptor,
  type FilterControl,
} from "@/components/shared/filter-bar"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

import {
  ALL_LAMA_ZONES,
  ALL_WORK_TYPES,
  POSITION_OPTIONS,
  STORE_OPTIONS,
  shortenWorkType,
} from "./_shared"

export interface FiltersBarProps {
  // search
  search: string
  onSearchChange: (v: string) => void
  // single-selects (1:1 с колонками таблицы)
  selectedStoreId: string
  onStoreIdChange: (v: string) => void
  selectedPositionId: string
  onPositionIdChange: (v: string) => void
  selectedZone: string
  onZoneChange: (v: string) => void
  selectedWorkType: string
  onWorkTypeChange: (v: string) => void
  selectedOnShift: string
  onOnShiftChange: (v: string) => void
  // flags
  hideStore: boolean
  // helpers
  activeFilterCount: number
  clearAllFilters: () => void
}

export function FiltersBar({
  search,
  onSearchChange,
  selectedStoreId,
  onStoreIdChange,
  selectedPositionId,
  onPositionIdChange,
  selectedZone,
  onZoneChange,
  selectedWorkType,
  onWorkTypeChange,
  selectedOnShift,
  onOnShiftChange,
  hideStore,
  activeFilterCount,
  clearAllFilters,
}: FiltersBarProps) {
  const t = useTranslations("screen.employees")

  // ── Filter options ───────────────────────────────────────────────
  const storeOptions = STORE_OPTIONS.map((s) => ({
    value: String(s.id),
    label: s.name,
  }))
  const positionOptions = POSITION_OPTIONS.map((p) => ({
    value: String(p.id),
    label: p.name,
  }))
  const zoneOptions = ALL_LAMA_ZONES.map((z) => ({
    value: z,
    label: z,
  }))
  const workTypeOptions = ALL_WORK_TYPES.map((wt) => ({
    value: wt,
    label: shortenWorkType(wt),
  }))
  const onShiftOptions = [
    { value: "yes", label: t("filters.on_shift.yes") },
    { value: "no", label: t("filters.on_shift.no") },
  ]

  // Shared filter controls (используются в desktop FilterBar и mobile sheet).
  const desktopControls: FilterControl[] = []
  desktopControls.push({
    kind: "single-select",
    value: selectedOnShift,
    onChange: onOnShiftChange,
    options: onShiftOptions,
    placeholder: t("filters.on_shift.label"),
    className: "w-40",
  })
  if (!hideStore) {
    desktopControls.push({
      kind: "single-select",
      value: selectedStoreId,
      onChange: onStoreIdChange,
      options: storeOptions,
      placeholder: t("filters.store"),
      className: "w-44",
    })
  }
  desktopControls.push(
    {
      kind: "single-select",
      value: selectedPositionId,
      onChange: onPositionIdChange,
      options: positionOptions,
      placeholder: t("filters.position"),
      className: "w-44",
    },
    {
      kind: "single-select",
      value: selectedZone,
      onChange: onZoneChange,
      options: zoneOptions,
      placeholder: t("filters.zone"),
      className: "w-40",
    },
    {
      kind: "single-select",
      value: selectedWorkType,
      onChange: onWorkTypeChange,
      options: workTypeOptions,
      placeholder: t("filters.work_types.label"),
      className: "w-40",
    },
  )

  // ── Filter chips ─────────────────────────────────────────────────
  const filterChips: FilterChipDescriptor[] = []

  if (selectedOnShift) {
    filterChips.push({
      key: "onshift",
      label: t("filters.on_shift.label"),
      value:
        selectedOnShift === "yes"
          ? t("filters.on_shift.yes")
          : t("filters.on_shift.no"),
      onRemove: () => onOnShiftChange(""),
    })
  }

  if (selectedStoreId && !hideStore) {
    const name =
      STORE_OPTIONS.find((s) => String(s.id) === selectedStoreId)?.name ??
      selectedStoreId
    filterChips.push({
      key: `store-${selectedStoreId}`,
      label: t("filters.store"),
      value: name,
      onRemove: () => onStoreIdChange(""),
    })
  }

  if (selectedPositionId) {
    const name =
      POSITION_OPTIONS.find((p) => String(p.id) === selectedPositionId)?.name ??
      selectedPositionId
    filterChips.push({
      key: `pos-${selectedPositionId}`,
      label: t("filters.position"),
      value: name,
      onRemove: () => onPositionIdChange(""),
    })
  }

  if (selectedZone) {
    filterChips.push({
      key: `zone-${selectedZone}`,
      label: t("filters.zone"),
      value: selectedZone,
      onRemove: () => onZoneChange(""),
    })
  }

  if (selectedWorkType) {
    filterChips.push({
      key: `wt-${selectedWorkType}`,
      label: t("filters.work_types.label"),
      value: shortenWorkType(selectedWorkType),
      onRemove: () => onWorkTypeChange(""),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchInput
          placeholder={t("filters.search_placeholder")}
          value={search}
          onChange={onSearchChange}
        />

        {/* Desktop filter comboboxes */}
        <FilterBar
          controls={desktopControls}
          className="hidden md:flex flex-1"
        />

        {/* Mobile filter sheet trigger */}
        <div className="md:hidden flex-1">
          <MobileFilterSheet
            activeCount={activeFilterCount}
            onClearAll={clearAllFilters}
            onApply={() => {
              /* filters apply on change */
            }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("filters.on_shift.label")}
                </p>
                <SingleSelectCombobox
                  options={onShiftOptions}
                  value={selectedOnShift}
                  onValueChange={onOnShiftChange}
                  placeholder={t("filters.on_shift.label")}
                  className="w-full"
                />
              </div>
              {!hideStore && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("filters.store")}</p>
                  <SingleSelectCombobox
                    options={storeOptions}
                    value={selectedStoreId}
                    onValueChange={onStoreIdChange}
                    placeholder={t("filters.store")}
                    className="w-full"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("filters.position")}</p>
                <SingleSelectCombobox
                  options={positionOptions}
                  value={selectedPositionId}
                  onValueChange={onPositionIdChange}
                  placeholder={t("filters.position")}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("filters.zone")}</p>
                <SingleSelectCombobox
                  options={zoneOptions}
                  value={selectedZone}
                  onValueChange={onZoneChange}
                  placeholder={t("filters.zone")}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("filters.work_types.label")}
                </p>
                <SingleSelectCombobox
                  options={workTypeOptions}
                  value={selectedWorkType}
                  onValueChange={onWorkTypeChange}
                  placeholder={t("filters.work_types.label")}
                  className="w-full"
                />
              </div>
            </div>
          </MobileFilterSheet>
        </div>
      </div>

      {/* Active filter chips */}
      <FilterChipsRow
        chips={filterChips}
        onClearAll={clearAllFilters}
        clearAllLabel={t("filters.clear_all")}
      />
    </div>
  )
}

/**
 * Search input с локальным state mirror — родитель оборачивает onChange
 * в startTransition (employees-list.tsx) для не-срочных URL-state updates.
 * Локальный mirror удерживает Input responsive под keystroke-нагрузкой.
 */
function SearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  const [inputValue, setInputValue] = React.useState(value)
  React.useEffect(() => {
    setInputValue((prev) => (prev === value ? prev : value))
  }, [value])
  return (
    <Input
      placeholder={placeholder}
      value={inputValue}
      onChange={(e) => {
        const v = e.target.value
        setInputValue(v)
        onChange(v)
      }}
      className="h-9 max-w-xs"
    />
  )
}
