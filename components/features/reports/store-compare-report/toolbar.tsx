"use client";

import {
  Download,
  Table2,
  LayoutGrid,
  ScatterChart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import type { ReportPeriod } from "@/lib/api/reports";

import type { T, ViewMode } from "./_shared";

interface ToolbarProps {
  t: T;
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  cityFilter: string;
  onCityFilterChange: (value: string) => void;
  cityOptions: { value: string; label: string }[];
  customFrom: Date | undefined;
  customTo: Date | undefined;
  onCustomRangeChange: (from: Date | undefined, to: Date | undefined) => void;
  isExporting: boolean;
  isLoading: boolean;
  onExport: () => void;
}

export function Toolbar({
  t,
  period,
  onPeriodChange,
  view,
  onViewChange,
  cityFilter,
  onCityFilterChange,
  cityOptions,
  customFrom,
  customTo,
  onCustomRangeChange,
  isExporting,
  isLoading,
  onExport,
}: ToolbarProps) {
  return (
    <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-3 pt-1 -mx-4 px-4 md:-mx-6 md:px-6 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Period tabs */}
        <div className="overflow-x-auto">
          <Tabs
            value={period}
            onValueChange={(v) => onPeriodChange(v as ReportPeriod)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="week">{t("period.week")}</TabsTrigger>
              <TabsTrigger value="month">{t("period.month")}</TabsTrigger>
              <TabsTrigger value="quarter">{t("period.quarter")}</TabsTrigger>
              <TabsTrigger value="custom">{t("period.custom")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right side: view toggle + export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && onViewChange(v as ViewMode)}
            variant="outline"
            className="overflow-x-auto"
          >
            <ToggleGroupItem
              value="table"
              aria-label={t("view.table")}
              className="min-w-11 gap-1.5 px-2 md:px-3"
            >
              <Table2 className="size-4 shrink-0" />
              <span className="hidden md:inline text-xs">{t("view.table")}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="heatmap"
              aria-label={t("view.heatmap")}
              className="min-w-11 gap-1.5 px-2 md:px-3"
            >
              <LayoutGrid className="size-4 shrink-0" />
              <span className="hidden md:inline text-xs">{t("view.heatmap")}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="scatter"
              aria-label={t("view.scatter")}
              className="min-w-11 gap-1.5 px-2 md:px-3"
            >
              <ScatterChart className="size-4 shrink-0" />
              <span className="hidden md:inline text-xs">{t("view.scatter")}</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={onExport}
            disabled={isExporting || isLoading}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">{t("toolbar.export_csv")}</span>
          </Button>
        </div>
      </div>

      {/* Second row: custom date range + city grouping */}
      {(period === "custom" || cityOptions.length > 2) && (
        <div className="flex flex-wrap gap-2 items-center">
          {period === "custom" && (
            <DateRangePicker
              from={customFrom}
              to={customTo}
              onChange={onCustomRangeChange}
              placeholder={`${t("toolbar.custom_range_from")} – ${t("toolbar.custom_range_to")}`}
              className="w-full sm:w-auto"
            />
          )}

          {/* City grouping combobox */}
          {cityOptions.length > 2 && (
            <SingleSelectCombobox
              options={cityOptions}
              value={cityFilter}
              onValueChange={onCityFilterChange}
              placeholder={t("toolbar.group_by_city")}
              searchPlaceholder="Поиск города..."
              className="w-full sm:w-[220px]"
            />
          )}
        </div>
      )}
    </div>
  );
}
