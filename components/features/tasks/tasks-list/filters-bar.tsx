"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelectCombobox } from "@/components/shared/multi-select-combobox"
import { DateRangePicker } from "@/components/shared/date-range-picker"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import {
  FilterBar,
  type FilterControl,
} from "@/components/shared/filter-bar"

interface Option {
  value: string
  label: string
}

export interface FiltersBarProps {
  search: string
  onSearchChange: (v: string) => void

  storeOptions: Option[]
  selectedStores: string[]
  onStoresChange: (v: string[]) => void

  zoneOptions: Option[]
  selectedZones: string[]
  onZonesChange: (v: string[]) => void

  workTypeOptions: Option[]
  selectedWorkTypes: string[]
  onWorkTypesChange: (v: string[]) => void

  categoryOptions: Option[]
  selectedCategories: string[]
  onCategoriesChange: (v: string[]) => void

  assigneeOptions: Option[]
  selectedAssignees: string[]
  onAssigneesChange: (v: string[]) => void

  dateFrom: Date | undefined
  dateTo: Date | undefined
  onDateRangeChange: (from: Date | undefined, to: Date | undefined) => void

  activeFilterCount: number
  onClearAll: () => void
  onApply: () => void
}

export function FiltersBar(props: FiltersBarProps) {
  const t = useTranslations("screen.tasks")

  const {
    search,
    onSearchChange,
    storeOptions,
    selectedStores,
    onStoresChange,
    zoneOptions,
    selectedZones,
    onZonesChange,
    workTypeOptions,
    selectedWorkTypes,
    onWorkTypesChange,
    categoryOptions,
    selectedCategories,
    onCategoriesChange,
    assigneeOptions,
    selectedAssignees,
    onAssigneesChange,
    dateFrom,
    dateTo,
    onDateRangeChange,
    activeFilterCount,
    onClearAll,
    onApply,
  } = props

  const desktopControls: FilterControl[] = [
    {
      kind: "search",
      value: search,
      onChange: onSearchChange,
      placeholder: t("filters.search_placeholder"),
      className: "h-9 md:basis-[280px] flex-1 min-w-[260px]",
    },
    {
      kind: "multi-select",
      value: selectedStores,
      onChange: onStoresChange,
      options: storeOptions,
      placeholder: t("filters.store"),
      className: "md:w-[180px]",
    },
    {
      kind: "multi-select",
      value: selectedZones,
      onChange: onZonesChange,
      options: zoneOptions,
      placeholder: t("filters.zone"),
      className: "md:w-[150px]",
    },
    {
      kind: "multi-select",
      value: selectedWorkTypes,
      onChange: onWorkTypesChange,
      options: workTypeOptions,
      placeholder: t("filters.work_type"),
      className: "md:w-[160px]",
    },
    {
      kind: "multi-select",
      value: selectedCategories,
      onChange: onCategoriesChange,
      options: categoryOptions,
      placeholder: t("filters.product_category"),
      className: "md:w-[170px]",
    },
    {
      kind: "multi-select",
      value: selectedAssignees,
      onChange: onAssigneesChange,
      options: assigneeOptions,
      placeholder: t("filters.assignee"),
      className: "md:w-[170px]",
    },
    {
      kind: "date-range",
      from: dateFrom,
      to: dateTo,
      onChange: (from, to) => onDateRangeChange(from, to),
      placeholder: t("filters.date_range"),
    },
  ]

  return (
    <>
      {/* Desktop filter row */}
      <div className="hidden md:block bg-card border border-border rounded-lg p-3">
        <FilterBar controls={desktopControls} />
      </div>

      {/* Mobile filter row */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex gap-2">
          <MobileSearchInput
            placeholder={t("filters.search_placeholder")}
            value={search}
            onChange={onSearchChange}
          />
          <MobileFilterSheet
            activeCount={activeFilterCount - (search ? 1 : 0)}
            onClearAll={onClearAll}
            onApply={onApply}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.store")}</Label>
                <MultiSelectCombobox
                  options={storeOptions}
                  selected={selectedStores}
                  onSelectionChange={onStoresChange}
                  placeholder={t("filters.store")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.zone")}</Label>
                <MultiSelectCombobox
                  options={zoneOptions}
                  selected={selectedZones}
                  onSelectionChange={onZonesChange}
                  placeholder={t("filters.zone")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.work_type")}</Label>
                <MultiSelectCombobox
                  options={workTypeOptions}
                  selected={selectedWorkTypes}
                  onSelectionChange={onWorkTypesChange}
                  placeholder={t("filters.work_type")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.product_category")}</Label>
                <MultiSelectCombobox
                  options={categoryOptions}
                  selected={selectedCategories}
                  onSelectionChange={onCategoriesChange}
                  placeholder={t("filters.product_category")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.assignee")}</Label>
                <MultiSelectCombobox
                  options={assigneeOptions}
                  selected={selectedAssignees}
                  onSelectionChange={onAssigneesChange}
                  placeholder={t("filters.assignee")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("filters.date_range")}</Label>
                <DateRangePicker
                  from={dateFrom}
                  to={dateTo}
                  onChange={(from, to) => onDateRangeChange(from, to)}
                  placeholder={t("filters.date_range")}
                />
              </div>
            </div>
          </MobileFilterSheet>
        </div>
      </div>
    </>
  )
}

/**
 * Mobile search input с локальным state mirror — родительский `onChange`
 * обычно завёрнут в startTransition (см. tasks-list.tsx) → значение из
 * пропа отстаёт от keystroke. Локальный state удерживает Input responsive.
 */
function MobileSearchInput({
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
      className="h-11 flex-1"
    />
  )
}
