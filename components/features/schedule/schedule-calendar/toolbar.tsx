"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { MobileFilterSheet } from "@/components/shared";

import type { ScheduleView } from "@/lib/api/shifts";

import type { ComboboxOption } from "./_shared";

interface ToolbarProps {
  view: ScheduleView;
  onViewChange: (view: ScheduleView) => void;
  periodLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;

  filterStore: string;
  onFilterStoreChange: (value: string) => void;
  storeOptions: ComboboxOption[];

  filterZones: string[];
  onFilterZonesChange: (zones: string[]) => void;
  zoneOptions: ComboboxOption[];

  activeFilterCount: number;
  onClearAllFilters: () => void;
}

export function Toolbar({
  view,
  onViewChange,
  periodLabel,
  onPrev,
  onNext,
  onToday,
  filterStore,
  onFilterStoreChange,
  storeOptions,
  filterZones,
  onFilterZonesChange,
  zoneOptions,
  activeFilterCount,
  onClearAllFilters,
}: ToolbarProps) {
  const t = useTranslations("screen.schedule");

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-col gap-3">
          {/* Row 1: nav + view switcher + store filter */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrev}
                aria-label={t("period.prev")}
                className="size-9"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToday}
                className="h-9 px-3 text-sm"
              >
                {t("period.today")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                aria-label={t("period.next")}
                className="size-9"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
              <span className="text-sm font-medium text-foreground ml-1">
                {periodLabel}
              </span>
            </div>

            {/* View switcher */}
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && onViewChange(v as ScheduleView)}
              className="hidden md:flex"
              aria-label={t("view_switcher.label")}
            >
              <ToggleGroupItem value="day" className="text-sm">
                {t("view_switcher.day")}
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="text-sm">
                {t("view_switcher.week")}
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className="text-sm">
                {t("view_switcher.month")}
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Mobile: day/week only */}
            <ToggleGroup
              type="single"
              value={view === "month" ? "week" : view}
              onValueChange={(v) => v && onViewChange(v as ScheduleView)}
              className="flex md:hidden"
              aria-label={t("view_switcher.label")}
            >
              <ToggleGroupItem value="day" className="text-sm">
                {t("view_switcher.day")}
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="text-sm">
                {t("view_switcher.week")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Row 2: Desktop filters */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            {/* Store: один store обязателен — нельзя «сбросить» в пустоту,
                нет «Все магазины». Если только 1 store — показываем как label. */}
            {storeOptions.length === 1 ? (
              <div className="inline-flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground">
                {storeOptions[0].label}
              </div>
            ) : (
              <Combobox
                options={storeOptions}
                value={filterStore}
                onValueChange={(v) => {
                  if (v) onFilterStoreChange(v);
                }}
                placeholder={t("filters.store")}
                className="w-56 h-9"
              />
            )}
            <Combobox
              options={zoneOptions}
              value={filterZones[0] ?? ""}
              onValueChange={(v) => {
                onFilterZonesChange(v ? [v] : []);
              }}
              placeholder={t("filters.zone")}
              className="w-40 h-9"
            />
          </div>

          {/* Row 2: Mobile filters button */}
          <MobileFilterSheet
            activeCount={activeFilterCount}
            onClearAll={onClearAllFilters}
            onApply={() => {}}
            className="md:hidden"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t("filters.store")}
                </label>
                {storeOptions.length === 1 ? (
                  <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground">
                    {storeOptions[0].label}
                  </div>
                ) : (
                  <Combobox
                    options={storeOptions}
                    value={filterStore}
                    onValueChange={(v) => {
                      if (v) onFilterStoreChange(v);
                    }}
                    placeholder={t("filters.store")}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t("filters.zone")}
                </label>
                <Combobox
                  options={zoneOptions}
                  value={filterZones[0] ?? ""}
                  onValueChange={(v) => {
                    onFilterZonesChange(v ? [v] : []);
                  }}
                  placeholder={t("filters.zone")}
                />
              </div>
            </div>
          </MobileFilterSheet>
        </div>
      </CardContent>
    </Card>
  );
}
