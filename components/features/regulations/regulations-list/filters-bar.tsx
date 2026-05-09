"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";

import { FilterMultiSelect } from "./filter-multi-select";

interface FiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  workTypeIds: number[];
  onWorkTypeIdsChange: (ids: number[]) => void;
  zoneIds: number[];
  onZoneIdsChange: (ids: number[]) => void;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
  activeChipsCount: number;
  onClearAll: () => void;
}

export function FiltersBar({
  search,
  onSearchChange,
  workTypeIds,
  onWorkTypeIdsChange,
  zoneIds,
  onZoneIdsChange,
  showArchived,
  onShowArchivedChange,
  activeChipsCount,
  onClearAll,
}: FiltersBarProps) {
  const t = useTranslations("screen.regulations");
  const tc = useTranslations("common");

  // Локальный mirror — родитель оборачивает onSearchChange в startTransition.
  const [searchInput, setSearchInput] = React.useState(search);
  React.useEffect(() => {
    setSearchInput((prev) => (prev === search ? prev : search));
  }, [search]);
  const handleSearch = (v: string) => {
    setSearchInput(v);
    onSearchChange(v);
  };

  const workTypeOptions = MOCK_WORK_TYPES.slice(0, 13).map((wt) => ({
    id: wt.id,
    name: wt.name,
  }));
  const zoneOptions = MOCK_ZONES.map((z) => ({ id: z.id, name: z.name }));

  return (
    <>
      {/* Filter row — desktop */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("filters.search_placeholder")}
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-9 w-72 max-w-full"
          aria-label={t("filters.search_placeholder")}
        />
        <FilterMultiSelect
          options={workTypeOptions}
          selected={workTypeIds}
          onChange={onWorkTypeIdsChange}
          placeholder={t("filters.work_type")}
        />
        <FilterMultiSelect
          options={zoneOptions}
          selected={zoneIds}
          onChange={onZoneIdsChange}
          placeholder={t("filters.zone")}
        />
        <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-background">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={onShowArchivedChange}
            className="scale-90"
          />
          <Label
            htmlFor="show-archived"
            className="text-sm font-normal cursor-pointer whitespace-nowrap"
          >
            {t("filters.show_archived")}
          </Label>
        </div>
      </div>

      {/* Filter row — mobile */}
      <MobileFilterSheet
        activeCount={activeChipsCount + (showArchived ? 1 : 0)}
        onClearAll={onClearAll}
        onApply={() => {}}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {tc("search")}
            </Label>
            <Input
              placeholder={t("filters.search_placeholder")}
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("filters.work_type")}
            </Label>
            <FilterMultiSelect
              options={workTypeOptions}
              selected={workTypeIds}
              onChange={onWorkTypeIdsChange}
              placeholder={t("filters.work_type")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("filters.zone")}
            </Label>
            <FilterMultiSelect
              options={zoneOptions}
              selected={zoneIds}
              onChange={onZoneIdsChange}
              placeholder={t("filters.zone")}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="mob-show-archived" className="text-sm font-normal cursor-pointer">
              {t("filters.show_archived")}
            </Label>
            <Switch
              id="mob-show-archived"
              checked={showArchived}
              onCheckedChange={onShowArchivedChange}
            />
          </div>
        </div>
      </MobileFilterSheet>
    </>
  );
}
