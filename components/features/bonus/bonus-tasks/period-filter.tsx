"use client";

import { useTranslations } from "next-intl";

import { PERIOD_OPTIONS, type PeriodFilter } from "./_shared";

interface PeriodFilterChipsProps {
  period: PeriodFilter;
  onChange: (period: PeriodFilter) => void;
}

export function PeriodFilterChips({ period, onChange }: PeriodFilterChipsProps) {
  const t = useTranslations("screen.bonusTasks");
  const tCommon = useTranslations("common");

  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Период">
      {PERIOD_OPTIONS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`inline-flex items-center rounded-full border px-3 h-8 text-xs font-medium transition-colors ${
            period === p
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
          }`}
        >
          {t(`filters.period_${p}`)}
        </button>
      ))}
      {period !== "today" && (
        <button
          onClick={() => onChange("today")}
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          {tCommon("clear_all")}
        </button>
      )}
    </div>
  );
}
