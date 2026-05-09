"use client";

import { useTranslations } from "next-intl";

export function LegendRow() {
  const t = useTranslations("screen.schedule");
  const items = [
    { key: "planned", color: "bg-info" },
    { key: "opened", color: "bg-success" },
    { key: "closed_normal", color: "bg-muted-foreground/40" },
    { key: "closed_late", color: "bg-warning" },
    { key: "closed_overtime", color: "bg-warning" },
    { key: "conflict", color: "bg-destructive" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="text-xs text-muted-foreground font-medium">
        {t("legend.label")}:
      </span>
      {items.map(({ key, color }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span
            className={`size-2.5 rounded-full ${color}`}
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">
            {t(`legend.${key}` as Parameters<typeof t>[0])}
          </span>
        </div>
      ))}
    </div>
  );
}
