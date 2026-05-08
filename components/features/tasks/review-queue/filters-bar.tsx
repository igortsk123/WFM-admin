"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

import type { SortOption, TFn } from "./_shared"

export interface FiltersBarProps {
  isNetworkOps: boolean
  storeOptions: { value: string; label: string }[]
  zoneOptions: { value: string; label: string }[]
  workTypeOptions: { value: string; label: string }[]
  assigneeOptions: { value: string; label: string }[]
  storeFilter: string
  zoneFilter: string
  workTypeFilter: string
  assigneeFilter: string
  sortBy: SortOption
  onStoreFilterChange: (v: string) => void
  onZoneFilterChange: (v: string) => void
  onWorkTypeFilterChange: (v: string) => void
  onAssigneeFilterChange: (v: string) => void
  onSortByChange: (v: SortOption) => void
  t: TFn
}

export function FiltersBar({
  isNetworkOps,
  storeOptions,
  zoneOptions,
  workTypeOptions,
  assigneeOptions,
  storeFilter,
  zoneFilter,
  workTypeFilter,
  assigneeFilter,
  sortBy,
  onStoreFilterChange,
  onZoneFilterChange,
  onWorkTypeFilterChange,
  onAssigneeFilterChange,
  onSortByChange,
  t,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isNetworkOps && (
        <SingleSelectCombobox
          options={storeOptions}
          value={storeFilter}
          onValueChange={onStoreFilterChange}
          placeholder={t("filter_store")}
          className="w-44"
        />
      )}
      <SingleSelectCombobox
        options={zoneOptions}
        value={zoneFilter}
        onValueChange={onZoneFilterChange}
        placeholder={t("filter_zone")}
        className="w-36"
      />
      <SingleSelectCombobox
        options={workTypeOptions}
        value={workTypeFilter}
        onValueChange={onWorkTypeFilterChange}
        placeholder={t("filter_work_type")}
        className="w-40"
      />
      <SingleSelectCombobox
        options={assigneeOptions}
        value={assigneeFilter}
        onValueChange={onAssigneeFilterChange}
        placeholder={t("filter_assignee")}
        className="w-44"
      />
      <Select value={sortBy} onValueChange={(v) => onSortByChange(v as SortOption)}>
        <SelectTrigger className="h-9 w-44 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="oldest">{t("sort_oldest")}</SelectItem>
          <SelectItem value="newest">{t("sort_newest")}</SelectItem>
          <SelectItem value="duration">{t("sort_duration")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
