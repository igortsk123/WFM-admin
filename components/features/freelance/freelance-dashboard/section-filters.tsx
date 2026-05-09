"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

import type { PeriodFilter } from "./_shared";

interface DashboardFiltersProps {
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  externalHrEnabled: boolean;
  sourceFilter: string;
  onSourceChange: (v: string) => void;
  sourceOptions: ComboboxOption[];
  storeFilter: string;
  onStoreChange: (v: string) => void;
  storeOptions: ComboboxOption[];
}

const PERIOD_OPTIONS: PeriodFilter[] = ["DAY", "WEEK", "MONTH"];

export function DashboardFilters({
  period,
  onPeriodChange,
  externalHrEnabled,
  sourceFilter,
  onSourceChange,
  sourceOptions,
  storeFilter,
  onStoreChange,
  storeOptions,
}: DashboardFiltersProps) {
  const t = useTranslations("screen.freelanceDashboard");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period segmented control */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
          {t("filters.period_label")}:
        </span>
        <ButtonGroup>
          {PERIOD_OPTIONS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => onPeriodChange(p)}
              className="min-h-[44px] px-3 text-xs"
              aria-pressed={period === p}
            >
              {t(
                `filters.period_${p.toLowerCase()}` as
                  | "filters.period_day"
                  | "filters.period_week"
                  | "filters.period_month"
              )}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {/* Source combobox — only if external_hr_enabled */}
      {externalHrEnabled && (
        <Combobox
          options={sourceOptions}
          value={sourceFilter}
          onValueChange={(v) => onSourceChange(v || "all")}
          placeholder={t("filters.source_all")}
          className="w-44 min-h-[44px] text-xs"
        />
      )}

      {/* Store combobox */}
      {storeOptions.length > 2 && (
        <Combobox
          options={storeOptions}
          value={storeFilter}
          onValueChange={(v) => onStoreChange(v || "all")}
          placeholder={t("filters.scope_label")}
          className="w-56 min-h-[44px] text-xs"
        />
      )}
    </div>
  );
}
