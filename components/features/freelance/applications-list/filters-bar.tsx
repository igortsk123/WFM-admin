"use client"

import { ToggleLeft, ToggleRight } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { FilterChip } from "@/components/shared/filter-chip"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { MultiSelectCombobox } from "@/components/shared/multi-select-combobox"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"
import { DateRangePicker } from "@/components/shared/date-range-picker"

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
  filterChips: { label: string; value: string; onRemove: () => void }[]
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
  const tCommon = useTranslations("common")

  const storeOptions = STORE_OPTIONS.map((s) => ({ value: s.id, label: s.name }))
  const workTypeOptions = WORK_TYPE_OPTIONS.map((w) => ({ value: w.id, label: w.name }))

  return (
    <>
      {/* Filter row — desktop */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        <MultiSelectCombobox
          options={storeOptions}
          selected={selectedStoreIds}
          onSelectionChange={onChangeStores}
          placeholder="Объект"
          className="min-w-[160px]"
        />
        <MultiSelectCombobox
          options={workTypeOptions}
          selected={selectedWorkTypeIds}
          onSelectionChange={onChangeWorkTypes}
          placeholder="Тип работ"
          className="min-w-[160px]"
        />
        <DateRangePicker
          from={parseIsoDate(dateFromParam)}
          to={parseIsoDate(dateToParam)}
          onChange={(from, to) => {
            onChangeDateFrom(from ? toIsoDate(from) : null)
            onChangeDateTo(to ? toIsoDate(to) : null)
          }}
          placeholder="Дата выхода"
        />
        {externalHrEnabled && (
          <SingleSelectCombobox
            options={SOURCE_OPTIONS}
            value={sourceParam}
            onValueChange={(v) => onChangeSource(v || null)}
            placeholder="Источник"
            className="min-w-[140px]"
          />
        )}

        {/* Unassigned toggle chip */}
        <Button
          variant={unassignedParam ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-sm font-normal",
            unassignedParam && "bg-primary text-primary-foreground"
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
      </div>

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
      {filterChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filterChips.map((chip, i) => (
            <FilterChip key={i} label={chip.label} value={chip.value} onRemove={chip.onRemove} />
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {tCommon("clearAll")}
          </button>
        </div>
      )}
    </>
  )
}
