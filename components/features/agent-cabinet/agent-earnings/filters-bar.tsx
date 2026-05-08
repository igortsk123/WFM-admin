"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox";
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

  const statusOptions: Array<{ value: "CALCULATED" | "PAID"; label: string }> = [
    { value: "CALCULATED", label: t("status.CALCULATED") },
    { value: "PAID", label: t("status.PAID") },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filters"
    >
      <DateRangePicker
        from={parseIsoDate(dateFrom)}
        to={parseIsoDate(dateTo)}
        onChange={(from, to) =>
          onChangeRange(
            from ? toIsoDate(from) : defaultDateFrom(),
            to ? toIsoDate(to) : defaultDateTo()
          )
        }
        placeholder={t("filters.date_range")}
      />
      <SingleSelectCombobox
        options={freelancerOptions}
        value={freelancerId}
        onValueChange={onChangeFreelancer}
        placeholder={t("filters.freelancer")}
        className="h-9 max-w-[220px]"
      />
      <SingleSelectCombobox
        options={statusOptions}
        value={status}
        onValueChange={onChangeStatus}
        placeholder={t("filters.status")}
        className="h-9"
      />
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={onClearAll}
        >
          <X className="size-3" aria-hidden="true" />
          {t("filters.clear_all")}
        </Button>
      )}
    </div>
  );
}
