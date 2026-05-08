"use client"

import { List, LayoutGrid } from "lucide-react"

import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { MultiSelectCombobox } from "@/components/shared/multi-select-combobox"
import { FilterChip } from "@/components/shared/filter-chip"

import { WORK_TYPE_GROUPS } from "../work-type-edit-dialog-content"
import type { ViewMode, TFn } from "./_shared"

export interface ActiveFilterChip {
  key: string
  label: string
  value: string
  onRemove: () => void
}

interface FiltersBarProps {
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void

  search: string
  onSearchChange: (v: string) => void

  selectedGroups: string[]
  onSelectedGroupsChange: (v: string[]) => void

  requiresPhoto: boolean | undefined
  onRequiresPhotoChange: (v: boolean | undefined) => void

  activeFilters: ActiveFilterChip[]
  onClearAll: () => void

  t: TFn
}

export function FiltersBar({
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  selectedGroups,
  onSelectedGroupsChange,
  requiresPhoto,
  onRequiresPhotoChange,
  activeFilters,
  onClearAll,
  t,
}: FiltersBarProps) {
  const groupOptions = WORK_TYPE_GROUPS.map((g) => ({ value: g, label: g }))

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: View toggle + Search + Group combobox + mobile sheet */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* View toggle — desktop only */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => {
            if (v) onViewModeChange(v as ViewMode)
          }}
          variant="outline"
          className="hidden md:flex shrink-0"
          aria-label="Вид"
        >
          <ToggleGroupItem value="list" aria-label="Список">
            <List className="size-4" aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem value="accordion" aria-label="По категориям">
            <LayoutGrid className="size-4" aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Search */}
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("filters.search_placeholder")}
            className="pl-3"
            aria-label={t("filters.search_placeholder")}
          />
        </div>

        {/* Group combobox — desktop */}
        <MultiSelectCombobox
          className="hidden md:flex w-[200px] shrink-0"
          options={groupOptions}
          selected={selectedGroups}
          onSelectionChange={onSelectedGroupsChange}
          placeholder={t("filters.group_all")}
          multiLabel={(n) => `Групп: ${n}`}
          searchPlaceholder="Поиск группы..."
          emptyLabel="Не найдено"
        />

        {/* Mobile: filter sheet */}
        <MobileFilterSheet
          activeCount={activeFilters.length}
          onClearAll={onClearAll}
          onApply={() => {}}
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">{t("filters.group")}</p>
              <div className="flex flex-wrap gap-2">
                {WORK_TYPE_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      onSelectedGroupsChange(
                        selectedGroups.includes(g)
                          ? selectedGroups.filter((x) => x !== g)
                          : [...selectedGroups, g]
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      selectedGroups.includes(g)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">
                {t("filters.requires_photo")}
              </p>
              <div className="flex gap-2">
                {[
                  { label: t("filters.requires_photo_yes"), value: true },
                  { label: t("filters.requires_photo_no"), value: false },
                ].map(({ label, value }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() =>
                      onRequiresPhotoChange(
                        requiresPhoto === value ? undefined : value
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      requiresPhoto === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </MobileFilterSheet>
      </div>

      {/* Filter chips row */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              value={chip.value}
              onRemove={chip.onRemove}
            />
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("filters.clear_all")}
          </button>
        </div>
      )}
    </div>
  )
}
