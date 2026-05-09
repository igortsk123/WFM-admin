"use client";

import { useTranslations } from "next-intl";

import type { BudgetPeriod } from "@/lib/types";

import {
  FilterBar,
  FilterChipsRow,
  type FilterChipDescriptor,
  type FilterControl,
} from "@/components/shared/filter-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FiltersBarProps {
  tab: "active" | "expired";
  onChangeTab: (v: "active" | "expired") => void;
  storeOptions: { value: string; label: string }[];
  filterStores: string[];
  onChangeStores: (vals: string[]) => void;
  filterPeriod: BudgetPeriod | "";
  onChangePeriod: (v: BudgetPeriod | "") => void;
  activeChips: FilterChipDescriptor[];
  onClearAll: () => void;
}

export function FiltersBar({
  tab,
  onChangeTab,
  storeOptions,
  filterStores,
  onChangeStores,
  filterPeriod,
  onChangePeriod,
  activeChips,
  onClearAll,
}: FiltersBarProps) {
  const t = useTranslations("freelanceBudgetLimits");
  const tCommon = useTranslations("common");

  const periodOptions = [
    { value: "DAY", label: t("period.DAY") },
    { value: "WEEK", label: t("period.WEEK") },
    { value: "MONTH", label: t("period.MONTH") },
  ];

  const controls: FilterControl[] = [
    {
      kind: "multi-select",
      value: filterStores,
      onChange: onChangeStores,
      options: storeOptions,
      placeholder: t("filters.object_placeholder"),
      searchPlaceholder: t("filters.search_object"),
      className: "min-w-[176px] min-h-11",
    },
    {
      kind: "single-select",
      value: filterPeriod,
      onChange: (v) => onChangePeriod((v as BudgetPeriod) || ""),
      options: periodOptions,
      placeholder: t("filters.period_placeholder"),
      className: "min-w-[144px] min-h-11",
    },
  ];

  return (
    <>
      {/* Tab switcher + filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs (desktop) / Select (mobile) */}
        <div className="hidden sm:block">
          <Tabs
            value={tab}
            onValueChange={(v) => onChangeTab(v as "active" | "expired")}
          >
            <TabsList>
              <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
              <TabsTrigger value="expired">{t("tabs.expired")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile tab select */}
        <div className="sm:hidden">
          <Select
            value={tab}
            onValueChange={(v) => onChangeTab(v as "active" | "expired")}
          >
            <SelectTrigger className="w-full min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("tabs.active")}</SelectItem>
              <SelectItem value="expired">{t("tabs.expired")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter row */}
        <FilterBar controls={controls} />
      </div>

      {/* Active filter chips */}
      <FilterChipsRow
        chips={activeChips}
        onClearAll={onClearAll}
        clearAllLabel={tCommon("clearAll")}
      />
    </>
  );
}
