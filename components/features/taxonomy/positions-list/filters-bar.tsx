"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import {
  FilterBar,
  type FilterControl,
} from "@/components/shared/filter-bar";

import type { TFn } from "./_shared";

export type RoleFilter = "" | "1" | "2";

interface FiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (value: RoleFilter) => void;
  onResetFilters: () => void;
  t: TFn;
}

export function FiltersBar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  onResetFilters,
  t,
}: FiltersBarProps) {
  const activeFilterCount = roleFilter ? 1 : 0;

  const roleOptions = [
    { value: "1", label: t("filters.role_worker") },
    { value: "2", label: t("filters.role_manager") },
  ];

  const desktopControls: FilterControl[] = [
    {
      kind: "search",
      value: search,
      onChange: onSearchChange,
      placeholder: t("filters.search_placeholder"),
      className: "h-9 max-w-xs",
    },
    {
      kind: "single-select",
      value: roleFilter,
      onChange: (v) => onRoleFilterChange(v as RoleFilter),
      options: roleOptions,
      placeholder: t("filters.role"),
      className: "h-9 w-44",
    },
  ];

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      {/* Desktop filter row */}
      <FilterBar controls={desktopControls} className="hidden md:flex flex-1" />

      {/* Mobile: search inline + filter sheet */}
      <div className="flex md:hidden items-center gap-2 flex-1">
        <FilterBar
          controls={[
            {
              kind: "search",
              value: search,
              onChange: onSearchChange,
              placeholder: t("filters.search_placeholder"),
              className: "h-9 flex-1",
            },
          ]}
          className="flex-1"
        />
        <MobileFilterSheet
          activeCount={activeFilterCount}
          onClearAll={onResetFilters}
          onApply={() => {}}
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">{t("filters.role")}</Label>
            <Select
              value={roleFilter}
              onValueChange={(v) => onRoleFilterChange(v as RoleFilter)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("filters.role_all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("filters.role_all")}</SelectItem>
                <SelectItem value="1">{t("filters.role_worker")}</SelectItem>
                <SelectItem value="2">{t("filters.role_manager")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </MobileFilterSheet>
      </div>
    </div>
  );
}
