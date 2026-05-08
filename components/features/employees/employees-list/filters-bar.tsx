"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import type {
  Permission,
  FunctionalRole,
} from "@/lib/types"

import { Input } from "@/components/ui/input"

import { FilterChip } from "@/components/shared/filter-chip"
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet"
import { MultiSelectCombobox } from "@/components/shared/multi-select-combobox"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

import {
  AGENT_OPTIONS,
  ALL_FREELANCER_STATUSES,
  ALL_PERMISSIONS,
  ALL_ROLES,
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
  selectedAgentIds: string[]
  onAgentIdsChange: (v: string[]) => void
  // singles
  selectedRole: string
  onRoleChange: (v: string) => void
  selectedEmploymentType: string
  onEmploymentTypeChange: (v: string) => void
  selectedFreelancerStatus: string
  onFreelancerStatusChange: (v: string) => void
  selectedSource: string
  onSourceChange: (v: string) => void
  // flags
  hideStore: boolean
  showAgentFilter: boolean
  showSourceFilter: boolean
  showFreelancerStatusFilter: boolean
  // helpers
  activeFilterCount: number
  clearAllFilters: () => void
  permLabelMap: Record<Permission, string>
  roleLabelMap: Record<string, string>
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
  selectedAgentIds,
  onAgentIdsChange,
  selectedRole,
  onRoleChange,
  selectedEmploymentType,
  onEmploymentTypeChange,
  selectedFreelancerStatus,
  onFreelancerStatusChange,
  selectedSource,
  onSourceChange,
  hideStore,
  showAgentFilter,
  showSourceFilter,
  showFreelancerStatusFilter,
  activeFilterCount,
  clearAllFilters,
  permLabelMap,
  roleLabelMap,
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
  const roleOptions: { value: FunctionalRole; label: string }[] = ALL_ROLES.map(
    (r) => ({
      value: r,
      label: roleLabelMap[r] ?? r,
    })
  )
  const employmentOptions = [
    { value: "STAFF", label: t("employment.staff") },
    { value: "FREELANCE", label: t("employment.freelance") },
  ]
  const agentOptions = AGENT_OPTIONS.map((a) => ({
    value: a.id,
    label: a.name,
  }))
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

  // ── Filter chips ─────────────────────────────────────────────────
  const filterChips: React.ReactNode[] = []

  selectedStoreIds.forEach((id) => {
    const name = STORE_OPTIONS.find((s) => String(s.id) === id)?.name ?? id
    filterChips.push(
      <FilterChip
        key={`store-${id}`}
        label={t("filters.store")}
        value={name}
        onRemove={() =>
          onStoreIdsChange(selectedStoreIds.filter((v) => v !== id))
        }
      />
    )
  })

  selectedPositionIds.forEach((id) => {
    const name = POSITION_OPTIONS.find((p) => String(p.id) === id)?.name ?? id
    filterChips.push(
      <FilterChip
        key={`pos-${id}`}
        label={t("filters.position")}
        value={name}
        onRemove={() =>
          onPositionIdsChange(selectedPositionIds.filter((v) => v !== id))
        }
      />
    )
  })

  selectedPermissions.forEach((p) => {
    filterChips.push(
      <FilterChip
        key={`perm-${p}`}
        label={t("filters.permission")}
        value={permLabelMap[p as Permission] ?? p}
        onRemove={() =>
          onPermissionsChange(selectedPermissions.filter((v) => v !== p))
        }
      />
    )
  })

  if (selectedRole) {
    filterChips.push(
      <FilterChip
        key="role"
        label={t("filters.functional_role")}
        value={roleLabelMap[selectedRole] ?? selectedRole}
        onRemove={() => onRoleChange("")}
      />
    )
  }

  if (selectedEmploymentType) {
    filterChips.push(
      <FilterChip
        key="emp"
        label={t("filters.employment_type")}
        value={
          selectedEmploymentType === "STAFF"
            ? t("employment.staff")
            : t("employment.freelance")
        }
        onRemove={() => onEmploymentTypeChange("")}
      />
    )
  }

  selectedAgentIds.forEach((id) => {
    const name = AGENT_OPTIONS.find((a) => a.id === id)?.name ?? id
    filterChips.push(
      <FilterChip
        key={`agent-${id}`}
        label={t("filters.agent")}
        value={name}
        onRemove={() =>
          onAgentIdsChange(selectedAgentIds.filter((v) => v !== id))
        }
      />
    )
  })

  if (selectedFreelancerStatus) {
    const statusLabel =
      freelancerStatusOptions.find((o) => o.value === selectedFreelancerStatus)
        ?.label ?? selectedFreelancerStatus
    filterChips.push(
      <FilterChip
        key="fstatus"
        label={t("filters.freelancer_status")}
        value={statusLabel}
        onRemove={() => onFreelancerStatusChange("")}
      />
    )
  }

  if (selectedSource) {
    filterChips.push(
      <FilterChip
        key="source"
        label={t("filters.source_creation")}
        value={
          selectedSource === "MANUAL"
            ? t("source.manual")
            : t("source.external")
        }
        onRemove={() => onSourceChange("")}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("filters.search_placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 max-w-xs"
        />

        {/* Desktop filter comboboxes */}
        <div className="hidden md:flex items-center gap-2 flex-wrap flex-1">
          {!hideStore && (
            <MultiSelectCombobox
              options={storeOptions}
              selected={selectedStoreIds}
              onSelectionChange={onStoreIdsChange}
              placeholder={t("filters.store")}
              className="w-44"
            />
          )}
          <MultiSelectCombobox
            options={positionOptions}
            selected={selectedPositionIds}
            onSelectionChange={onPositionIdsChange}
            placeholder={t("filters.position")}
            className="w-44"
          />
          <MultiSelectCombobox
            options={permOptions}
            selected={selectedPermissions}
            onSelectionChange={onPermissionsChange}
            placeholder={t("filters.permission")}
            className="w-40"
          />
          <SingleSelectCombobox
            options={roleOptions}
            value={selectedRole}
            onValueChange={onRoleChange}
            placeholder={t("filters.functional_role")}
            className="w-44"
          />
          <SingleSelectCombobox
            options={employmentOptions}
            value={selectedEmploymentType}
            onValueChange={(v) => {
              onEmploymentTypeChange(v)
              if (v !== "FREELANCE") onFreelancerStatusChange("")
            }}
            placeholder={t("filters.employment_type")}
            className="w-40"
          />
          {showFreelancerStatusFilter && (
            <SingleSelectCombobox
              options={freelancerStatusOptions}
              value={selectedFreelancerStatus}
              onValueChange={onFreelancerStatusChange}
              placeholder={t("filters.freelancer_status")}
              className="w-44"
            />
          )}
          {showAgentFilter && (
            <MultiSelectCombobox
              options={agentOptions}
              selected={selectedAgentIds}
              onSelectionChange={onAgentIdsChange}
              placeholder={t("filters.agent")}
              className="w-44"
            />
          )}
          {showSourceFilter && (
            <SingleSelectCombobox
              options={sourceOptions}
              value={selectedSource}
              onValueChange={onSourceChange}
              placeholder={t("filters.source_creation")}
              className="w-44"
            />
          )}
        </div>

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
                  {t("filters.functional_role")}
                </p>
                <SingleSelectCombobox
                  options={roleOptions}
                  value={selectedRole}
                  onValueChange={onRoleChange}
                  placeholder={t("filters.functional_role")}
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
              {showAgentFilter && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("filters.agent")}</p>
                  <MultiSelectCombobox
                    options={agentOptions}
                    selected={selectedAgentIds}
                    onSelectionChange={onAgentIdsChange}
                    placeholder={t("filters.agent")}
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
                  {t("filters.permission")}
                </p>
                <MultiSelectCombobox
                  options={permOptions}
                  selected={selectedPermissions}
                  onSelectionChange={onPermissionsChange}
                  placeholder={t("filters.permission")}
                  className="w-full"
                />
              </div>
            </div>
          </MobileFilterSheet>
        </div>
      </div>

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <div className="flex items-center flex-wrap gap-2">
          {filterChips}
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            {t("filters.clear_all")}
          </button>
        </div>
      )}
    </div>
  )
}
