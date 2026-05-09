"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { FilterChip } from "@/components/shared/filter-chip";

import { ComboboxFilter } from "./combobox-filter";
import type { FilterOption } from "./use-services-data";

interface SectionFiltersProps {
  isNominal: boolean;

  storeOptions: FilterOption[];
  freelancerOptions: FilterOption[];
  agentOptions: FilterOption[];
  workTypeOptions: FilterOption[];

  storeFilter: string;
  freelancerFilter: string;
  agentFilter: string;
  workTypeFilter: string;

  setStoreFilter: (v: string) => void;
  setFreelancerFilter: (v: string) => void;
  setAgentFilter: (v: string) => void;
  setWorkTypeFilter: (v: string) => void;

  activeFilterCount: number;
  onClearAll: () => void;
}

export function SectionFilters({
  isNominal,
  storeOptions,
  freelancerOptions,
  agentOptions,
  workTypeOptions,
  storeFilter,
  freelancerFilter,
  agentFilter,
  workTypeFilter,
  setStoreFilter,
  setFreelancerFilter,
  setAgentFilter,
  setWorkTypeFilter,
  activeFilterCount,
  onClearAll,
}: SectionFiltersProps) {
  const t = useTranslations("screen.freelanceServicesList");
  const tc = useTranslations("common");

  return (
    <>
      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <ComboboxFilter
          options={storeOptions}
          value={storeFilter}
          onChange={setStoreFilter}
          placeholder={t("filters.store_placeholder")}
          buttonLabel={t("filters.store")}
        />
        <ComboboxFilter
          options={freelancerOptions}
          value={freelancerFilter}
          onChange={setFreelancerFilter}
          placeholder={t("filters.freelancer_placeholder")}
          buttonLabel={t("filters.freelancer")}
        />
        {isNominal && (
          <ComboboxFilter
            options={agentOptions}
            value={agentFilter}
            onChange={setAgentFilter}
            placeholder={t("filters.agent_placeholder")}
            buttonLabel={t("filters.agent")}
          />
        )}
        <ComboboxFilter
          options={workTypeOptions}
          value={workTypeFilter}
          onChange={setWorkTypeFilter}
          placeholder={t("filters.work_type_placeholder")}
          buttonLabel={t("filters.work_type")}
        />
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground hover:text-foreground"
            onClick={onClearAll}
          >
            {tc("clearAll")}
            <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {storeFilter && (
            <FilterChip
              label={t("filters.store")}
              value={
                storeOptions.find((o) => o.value === storeFilter)?.label ??
                storeFilter
              }
              onRemove={() => setStoreFilter("")}
            />
          )}
          {freelancerFilter && (
            <FilterChip
              label={t("filters.freelancer")}
              value={
                freelancerOptions.find((o) => o.value === freelancerFilter)
                  ?.label ?? freelancerFilter
              }
              onRemove={() => setFreelancerFilter("")}
            />
          )}
          {agentFilter && isNominal && (
            <FilterChip
              label={t("filters.agent")}
              value={
                agentOptions.find((o) => o.value === agentFilter)?.label ??
                agentFilter
              }
              onRemove={() => setAgentFilter("")}
            />
          )}
          {workTypeFilter && (
            <FilterChip
              label={t("filters.work_type")}
              value={
                workTypeOptions.find((o) => o.value === workTypeFilter)
                  ?.label ?? workTypeFilter
              }
              onRemove={() => setWorkTypeFilter("")}
            />
          )}
        </div>
      )}
    </>
  );
}
