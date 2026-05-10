"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import type { Permission } from "@/lib/types"

import { Input } from "@/components/ui/input"

import {
  FilterBar,
  FilterChipsRow,
  type FilterChipDescriptor,
  type FilterControl,
} from "@/components/shared/filter-bar"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { MultiSelectCombobox } from "@/components/shared/multi-select-combobox"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

import {
  ALL_FREELANCER_STATUSES,
  ALL_PERMISSIONS,
  POSITION_OPTIONS,
  STORE_OPTIONS,
} from "./_shared"

export interface FiltersBarProps {
  // search
  search: string
  onSearchChange: (v: string) => void
  // multi-selects
  selectedStoreIds: string[]
  onStoreIdsChange: (v: string[]) => void
  selectedPositionIds: string[]
  onPositionIdsChange: (v: string[]) => void
  selectedPermissions: string[]
  onPermissionsChange: (v: string[]) => void
  // singles
  selectedEmploymentType: string
  onEmploymentTypeChange: (v: string) => void
  selectedFreelancerStatus: string
  onFreelancerStatusChange: (v: string) => void
  selectedSource: string
  onSourceChange: (v: string) => void
  // flags
  hideStore: boolean
  showSourceFilter: boolean
  showFreelancerStatusFilter: boolean
  // helpers
  activeFilterCount: number
  clearAllFilters: () => void
  permLabelMap: Record<Permission, string>
}

export function FiltersBar({
  search,
  onSearchChange,
  selectedStoreIds,
  onStoreIdsChange,
  selectedPositionIds,
  onPositionIdsChange,
  selectedPermissions,
  onPermissionsChange,
  selectedEmploymentType,
  onEmploymentTypeChange,
  selectedFreelancerStatus,
  onFreelancerStatusChange,
  selectedSource,
  onSourceChange,
  hideStore,
  showSourceFilter,
  showFreelancerStatusFilter,
  activeFilterCount,
  clearAllFilters,
  permLabelMap,
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
  const permOptions = ALL_PERMISSIONS.map((p) => ({
    value: p,
    label: permLabelMap[p],
  }))
  const employmentOptions = [
    { value: "STAFF", label: t("employment.staff") },
    { value: "FREELANCE", label: t("employment.freelance") },
  ]
  const freelancerStatusOptions = ALL_FREELANCER_STATUSES.map((s) => ({
    value: s,
    label:
      s === "NEW"
        ? "Новый"
        : s === "VERIFICATION"
          ? "Проверка"
          : s === "ACTIVE"
            ? "Активен"
            : s === "BLOCKED"
              ? "Заблокирован"
              : "Архив",
  }))
  const sourceOptions = [
    { value: "MANUAL", label: t("source.manual") },
    { value: "EXTERNAL_SYNC", label: t("source.external") },
  ]

  // Shared filter controls (used in both desktop FilterBar and mobile sheet via render-prop wrappers)
  const desktopControls: FilterControl[] = []
  if (!hideStore) {
    desktopControls.push({
      kind: "multi-select",
      value: selectedStoreIds,
      onChange: onStoreIdsChange,
      options: storeOptions,
      placeholder: t("filters.store"),
      className: "w-44",
    })
  }
  desktopControls.push(
    {
      kind: "multi-select",
      value: selectedPositionIds,
      onChange: onPositionIdsChange,
      options: positionOptions,
      placeholder: t("filters.position"),
      className: "w-44",
    },
    {
      kind: "multi-select",
      value: selectedPermissions,
      onChange: onPermissionsChange,
      options: permOptions,
      placeholder: t("filters.zone"),
      className: "w-40",
    },
    {
      kind: "single-select",
      value: selectedEmploymentType,
      onChange: (v) => {
        onEmploymentTypeChange(v)
        if (v !== "FREELANCE") onFreelancerStatusChange("")
      },
      options: employmentOptions,
      placeholder: t("filters.employment_type"),
      className: "w-40",
    },
  )
  if (showFreelancerStatusFilter) {
    desktopControls.push({
      kind: "single-select",
      value: selectedFreelancerStatus,
      onChange: onFreelancerStatusChange,
      options: freelancerStatusOptions,
      placeholder: t("filters.freelancer_status"),
      className: "w-44",
    })
  }
  if (showSourceFilter) {
    desktopControls.push({
      kind: "single-select",
      value: selectedSource,
      onChange: onSourceChange,
      options: sourceOptions,
      placeholder: t("filters.source_creation"),
      className: "w-44",
    })
  }

  // ── Filter chips ─────────────────────────────────────────────────
  const filterChips: FilterChipDescriptor[] = []

  selectedStoreIds.forEach((id) => {
    const name = STORE_OPTIONS.find((s) => String(s.id) === id)?.name ?? id
    filterChips.push({
      key: `store-${id}`,
      label: t("filters.store"),
      value: name,
      onRemove: () =>
        onStoreIdsChange(selectedStoreIds.filter((v) => v !== id)),
    })
  })

  selectedPositionIds.forEach((id) => {
    const name = POSITION_OPTIONS.find((p) => String(p.id) === id)?.name ?? id
    filterChips.push({
      key: `pos-${id}`,
      label: t("filters.position"),
      value: name,
      onRemove: () =>
        onPositionIdsChange(selectedPositionIds.filter((v) => v !== id)),
    })
  })

  selectedPermissions.forEach((p) => {
    filterChips.push({
      key: `perm-${p}`,
      label: t("filters.zone"),
      value: permLabelMap[p as Permission] ?? p,
      onRemove: () =>
        onPermissionsChange(selectedPermissions.filter((v) => v !== p)),
    })
  })

  if (selectedEmploymentType) {
    filterChips.push({
      key: "emp",
      label: t("filters.employment_type"),
      value:
        selectedEmploymentType === "STAFF"
          ? t("employment.staff")
          : t("employment.freelance"),
      onRemove: () => onEmploymentTypeChange(""),
    })
  }

  if (selectedFreelancerStatus) {
    const statusLabel =
      freelancerStatusOptions.find((o) => o.value === selectedFreelancerStatus)
        ?.label ?? selectedFreelancerStatus
    filterChips.push({
      key: "fstatus",
      label: t("filters.freelancer_status"),
      value: statusLabel,
      onRemove: () => onFreelancerStatusChange(""),
    })
  }

  if (selectedSource) {
    filterChips.push({
      key: "source",
      label: t("filters.source_creation"),
      value:
        selectedSource === "MANUAL"
          ? t("source.manual")
          : t("source.external"),
      onRemove: () => onSourceChange(""),
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
              {!hideStore && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("filters.store")}</p>
                  <MultiSelectCombobox
                    options={storeOptions}
                    selected={selectedStoreIds}
                    onSelectionChange={onStoreIdsChange}
                    placeholder={t("filters.store")}
                    className="w-full"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("filters.position")}</p>
                <MultiSelectCombobox
                  options={positionOptions}
                  selected={selectedPositionIds}
                  onSelectionChange={onPositionIdsChange}
                  placeholder={t("filters.position")}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("filters.employment_type")}
                </p>
                <SingleSelectCombobox
                  options={employmentOptions}
                  value={selectedEmploymentType}
                  onValueChange={(v) => {
                    onEmploymentTypeChange(v)
                    if (v !== "FREELANCE") onFreelancerStatusChange("")
                  }}
                  placeholder={t("filters.employment_type")}
                  className="w-full"
                />
              </div>
              {showFreelancerStatusFilter && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {t("filters.freelancer_status")}
                  </p>
                  <SingleSelectCombobox
                    options={freelancerStatusOptions}
                    value={selectedFreelancerStatus}
                    onValueChange={onFreelancerStatusChange}
                    placeholder={t("filters.freelancer_status")}
                    className="w-full"
                  />
                </div>
              )}
              {showSourceFilter && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {t("filters.source_creation")}
                  </p>
                  <SingleSelectCombobox
                    options={sourceOptions}
                    value={selectedSource}
                    onValueChange={onSourceChange}
                    placeholder={t("filters.source_creation")}
                    className="w-full"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("filters.zone")}
                </p>
                <MultiSelectCombobox
                  options={permOptions}
                  selected={selectedPermissions}
                  onSelectionChange={onPermissionsChange}
                  placeholder={t("filters.zone")}
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
