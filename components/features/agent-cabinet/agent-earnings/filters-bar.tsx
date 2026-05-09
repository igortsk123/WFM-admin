"use client";

import { useTranslations } from "next-intl";

import { FilterBar, type FilterControl } from "@/components/shared/filter-bar";
import {
  defaultDateFrom,
  defaultDateTo,
  parseIsoDate,
  toIsoDate,
  type FreelancerOption,
} from "./_shared";

interface FiltersBarProps {
  dateFrom: string;
  dateTo: string;
  freelancerId: string;
  status: string;
  freelancers: FreelancerOption[];
  activeFiltersCount: number;
  onChangeRange: (from: string, to: string) => void;
  onChangeFreelancer: (id: string) => void;
  onChangeStatus: (status: string) => void;
  onClearAll: () => void;
}

export function FiltersBar({
  dateFrom,
  dateTo,
  freelancerId,
  status,
  freelancers,
  activeFiltersCount,
  onChangeRange,
  onChangeFreelancer,
  onChangeStatus,
  onClearAll,
}: FiltersBarProps) {
  const t = useTranslations("screen.agentEarnings");

  const freelancerOptions = freelancers.map((f) => ({
    value: String(f.id),
    label: f.name,
  }));

  const statusOptions = [
    { value: "CALCULATED", label: t("status.CALCULATED") },
    { value: "PAID", label: t("status.PAID") },
  ];

  const controls: FilterControl[] = [
    {
      kind: "date-range",
      from: parseIsoDate(dateFrom),
      to: parseIsoDate(dateTo),
      onChange: (from, to) =>
        onChangeRange(
          from ? toIsoDate(from) : defaultDateFrom(),
          to ? toIsoDate(to) : defaultDateTo(),
        ),
      placeholder: t("filters.date_range"),
    },
    {
      kind: "single-select",
      value: freelancerId,
      onChange: onChangeFreelancer,
      options: freelancerOptions,
      placeholder: t("filters.freelancer"),
      className: "h-9 max-w-[220px]",
    },
    {
      kind: "single-select",
      value: status,
      onChange: onChangeStatus,
      options: statusOptions,
      placeholder: t("filters.status"),
      className: "h-9",
    },
  ];

  return (
    <FilterBar
      controls={controls}
      activeFiltersCount={activeFiltersCount}
      onClearAll={onClearAll}
      clearAllLabel={t("filters.clear_all")}
    />
  );
}
