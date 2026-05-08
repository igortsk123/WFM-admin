"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";

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

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("filters.search_placeholder")}
          className="h-9 pl-3 pr-3"
          aria-label={t("filters.search_placeholder")}
        />
      </div>

      {/* Role filter — desktop */}
      <Select
        value={roleFilter}
        onValueChange={(v) => onRoleFilterChange(v as RoleFilter)}
      >
        <SelectTrigger className="h-9 w-full md:w-44 hidden md:flex">
          <SelectValue placeholder={t("filters.role")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{t("filters.role_all")}</SelectItem>
          <SelectItem value="1">{t("filters.role_worker")}</SelectItem>
          <SelectItem value="2">{t("filters.role_manager")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Role filter — mobile inside sheet */}
      <MobileFilterSheet
        activeCount={activeFilterCount}
        onClearAll={onResetFilters}
        onApply={() => {}}
        className="md:hidden"
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
  );
}
