"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Shield, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { FilterChip } from "@/components/shared/filter-chip";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";

import type { FilterState } from "./_shared";
import { DateRangePicker } from "./date-range-picker";
import { MultiCombobox } from "./multi-combobox";

export interface ActiveFilterChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface FilterOption {
  value: string;
  label: string;
}

interface FiltersBarProps {
  filters: FilterState;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onPatchFilters: (patch: Partial<FilterState>) => void;
  onClearAll: () => void;
  entityTypeOptions: FilterOption[];
  actionOptions: FilterOption[];
  activeFilters: ActiveFilterChip[];
}

export function FiltersBar({
  filters,
  searchInput,
  onSearchInputChange,
  onPatchFilters,
  onClearAll,
  entityTypeOptions,
  actionOptions,
  activeFilters,
}: FiltersBarProps) {
  const t = useTranslations("screen.audit");
  const tc = useTranslations("common");

  const filterChildren = (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("filters.entity_type")}
        </p>
        <MultiCombobox
          options={entityTypeOptions}
          selected={filters.entityTypes}
          onChange={(v) => onPatchFilters({ entityTypes: v })}
          placeholder={t("filters.entity_type")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("filters.action")}
        </p>
        <MultiCombobox
          options={actionOptions}
          selected={filters.actions}
          onChange={(v) => onPatchFilters({ actions: v })}
          placeholder={t("filters.action")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {tc("dateRange")}
        </p>
        <DateRangePicker
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(from, to) => onPatchFilters({ dateFrom: from, dateTo: to })}
          placeholder={t("filters.date_range")}
        />
      </div>
      {/* Platform action toggle */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          role="switch"
          aria-checked={filters.platformActionOnly}
          onClick={() =>
            onPatchFilters({ platformActionOnly: !filters.platformActionOnly })
          }
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filters.platformActionOnly ? "bg-info" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
              filters.platformActionOnly ? "translate-x-4.5" : "translate-x-0.5"
            )}
          />
        </button>
        <span className="text-xs text-muted-foreground select-none">
          {t("platform_action.filter_toggle")}
        </span>
      </div>
    </>
  );

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b pb-3 -mx-4 px-4 md:-mx-6 md:px-6 flex flex-col gap-3 pt-2">
      {/* Search */}
      <Input
        placeholder={t("filters.search_placeholder")}
        value={searchInput}
        onChange={(e) => onSearchInputChange(e.target.value)}
        className="h-9 w-full"
        aria-label={t("filters.search_placeholder")}
      />

      {/* Desktop filters */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        <MultiCombobox
          options={entityTypeOptions}
          selected={filters.entityTypes}
          onChange={(v) => onPatchFilters({ entityTypes: v })}
          placeholder={t("filters.entity_type")}
        />
        <MultiCombobox
          options={actionOptions}
          selected={filters.actions}
          onChange={(v) => onPatchFilters({ actions: v })}
          placeholder={t("filters.action")}
        />
        <DateRangePicker
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(from, to) => onPatchFilters({ dateFrom: from, dateTo: to })}
          placeholder={t("filters.date_range")}
        />
        {/* Platform action toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="switch"
                aria-checked={filters.platformActionOnly}
                onClick={() =>
                  onPatchFilters({
                    platformActionOnly: !filters.platformActionOnly,
                  })
                }
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors",
                  filters.platformActionOnly
                    ? "border-info/50 bg-info/10 text-info"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                <Shield className="size-3.5" />
                {t("platform_action.badge")}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("platform_action.filter_toggle")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={onClearAll}
          >
            <X className="size-3.5 mr-1" />
            {t("filters.clear_all")}
          </Button>
        )}
      </div>

      {/* Mobile filter sheet trigger */}
      <MobileFilterSheet
        activeCount={activeFilters.length}
        onClearAll={onClearAll}
        onApply={() => {}}
      >
        {filterChildren}
      </MobileFilterSheet>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5"
          role="list"
          aria-label="Active filters"
        >
          {activeFilters.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              value={chip.value}
              onRemove={chip.onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
