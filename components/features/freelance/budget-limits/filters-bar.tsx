"use client";

import { useTranslations } from "next-intl";

import type { BudgetPeriod } from "@/lib/types";

import { FilterChip } from "@/components/shared/filter-chip";
import { MultiSelectCombobox } from "@/components/shared/multi-select-combobox";
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface FilterChipDescriptor {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

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
        <div className="flex flex-wrap gap-2">
          {/* Object filter — multi-select */}
          <MultiSelectCombobox
            options={storeOptions}
            selected={filterStores}
            onSelectionChange={onChangeStores}
            placeholder={t("filters.object_placeholder")}
            searchPlaceholder={t("filters.search_object")}
            className="min-w-[176px] min-h-11"
          />

          {/* Period filter — single-select */}
          <SingleSelectCombobox
            options={periodOptions}
            value={filterPeriod}
            onValueChange={(v) => onChangePeriod((v as BudgetPeriod) || "")}
            placeholder={t("filters.period_placeholder")}
            className="min-w-[144px] min-h-11"
          />
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={tCommon("filters")}
        >
          {activeChips.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              value={chip.value}
              onRemove={chip.onRemove}
            />
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors px-1"
          >
            {tCommon("clearAll")}
          </button>
        </div>
      )}
    </>
  );
}
