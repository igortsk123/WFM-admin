"use client"

import { ToggleLeft, ToggleRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { MultiSelectCombobox } from "@/components/shared/multi-select-combobox"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"
import { DateRangePicker } from "@/components/shared/date-range-picker"
import {
  FilterBar,
  FilterChipsRow,
  type FilterChipDescriptor,
  type FilterControl,
} from "@/components/shared/filter-bar"

import {
  STORE_OPTIONS,
  WORK_TYPE_OPTIONS,
  SOURCE_OPTIONS,
  parseIsoDate,
  toIsoDate,
} from "./_shared"

interface FiltersBarProps {
  externalHrEnabled: boolean
  selectedStoreIds: string[]
  selectedWorkTypeIds: string[]
  dateFromParam: string
  dateToParam: string
  sourceParam: string
  unassignedParam: boolean
  activeFilterCount: number
  onChangeStores: (values: string[]) => void
  onChangeWorkTypes: (values: string[]) => void
  onChangeDateFrom: (value: string | null) => void
  onChangeDateTo: (value: string | null) => void
  onChangeSource: (value: string | null) => void
  onChangeUnassigned: (value: boolean | null) => void
  onClearAll: () => void
  filterChips: FilterChipDescriptor[]
}

export function FiltersBar({
  externalHrEnabled,
  selectedStoreIds,
  selectedWorkTypeIds,
  dateFromParam,
  dateToParam,
  sourceParam,
  unassignedParam,
  activeFilterCount,
  onChangeStores,
  onChangeWorkTypes,
  onChangeDateFrom,
  onChangeDateTo,
  onChangeSource,
  onChangeUnassigned,
  onClearAll,
  filterChips,
}: FiltersBarProps) {
  const storeOptions = STORE_OPTIONS.map((s) => ({ value: s.id, label: s.name }))
  const workTypeOptions = WORK_TYPE_OPTIONS.map((w) => ({ value: w.id, label: w.name }))

  const desktopControls: FilterControl[] = [
    {
      kind: "multi-select",
      value: selectedStoreIds,
      onChange: onChangeStores,
      options: storeOptions,
      placeholder: "Объект",
      className: "min-w-[160px]",
    },
    {
      kind: "multi-select",
      value: selectedWorkTypeIds,
      onChange: onChangeWorkTypes,
      options: workTypeOptions,
      placeholder: "Тип работ",
      className: "min-w-[160px]",
    },
    {
      kind: "date-range",
      from: parseIsoDate(dateFromParam),
      to: parseIsoDate(dateToParam),
      onChange: (from, to) => {
        onChangeDateFrom(from ? toIsoDate(from) : null)
        onChangeDateTo(to ? toIsoDate(to) : null)
      },
      placeholder: "Дата выхода",
    },
  ]

  if (externalHrEnabled) {
    desktopControls.push({
      kind: "single-select",
      value: sourceParam,
      onChange: (v) => onChangeSource(v || null),
      options: SOURCE_OPTIONS,
      placeholder: "Источник",
      className: "min-w-[140px]",
    })
  }

  desktopControls.push({
    kind: "custom",
    key: "unassigned-toggle",
    render: () => (
      <Button
        variant={unassignedParam ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-9 gap-1.5 text-sm font-normal",
          unassignedParam && "bg-primary text-primary-foreground",
        )}
        onClick={() => onChangeUnassigned(unassignedParam ? null : true)}
        aria-pressed={unassignedParam}
      >
        {unassignedParam ? (
          <ToggleRight className="size-4 shrink-0" />
        ) : (
          <ToggleLeft className="size-4 shrink-0" />
        )}
        Требуют назначения
      </Button>
    ),
  })

  return (
    <>
      {/* Filter row — desktop */}
      <FilterBar controls={desktopControls} desktopOnly />

      {/* Mobile filter sheet */}
      <MobileFilterSheet
        activeCount={activeFilterCount}
        onClearAll={onClearAll}
        onApply={() => {}}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Объект</label>
            <MultiSelectCombobox
              options={storeOptions}
              selected={selectedStoreIds}
              onSelectionChange={onChangeStores}
              placeholder="Выберите объект"
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Тип работ</label>
            <MultiSelectCombobox
              options={workTypeOptions}
              selected={selectedWorkTypeIds}
              onSelectionChange={onChangeWorkTypes}
              placeholder="Выберите тип"
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Дата выхода</label>
            <DateRangePicker
              from={parseIsoDate(dateFromParam)}
              to={parseIsoDate(dateToParam)}
              onChange={(from, to) => {
                onChangeDateFrom(from ? toIsoDate(from) : null)
                onChangeDateTo(to ? toIsoDate(to) : null)
              }}
              placeholder="Период"
            />
          </div>
          {externalHrEnabled && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Источник</label>
              <SingleSelectCombobox
                options={SOURCE_OPTIONS}
                value={sourceParam}
                onValueChange={(v) => onChangeSource(v || null)}
                placeholder="Все источники"
                className="w-full"
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant={unassignedParam ? "default" : "outline"}
              size="sm"
              className="w-full h-11 gap-2"
              onClick={() => onChangeUnassigned(unassignedParam ? null : true)}
            >
              {unassignedParam ? (
                <ToggleRight className="size-4" />
              ) : (
                <ToggleLeft className="size-4" />
              )}
              Требуют назначения
            </Button>
          </div>
        </div>
      </MobileFilterSheet>

      {/* Active filter chips */}
      <FilterChipsRow chips={filterChips} onClearAll={onClearAll} />
    </>
  )
}
