import { useTranslations } from "next-intl";
import { Clock, Coffee, UtensilsCrossed } from "lucide-react";

import { EmptyState } from "@/components/shared";

import type { ShiftDetailData } from "./_shared";

function breakTypeIcon(type: "lunch" | "rest" | "custom") {
  switch (type) {
    case "lunch":
      return <UtensilsCrossed className="size-3.5 text-muted-foreground" />;
    case "rest":
      return <Coffee className="size-3.5 text-muted-foreground" />;
    default:
      return <Clock className="size-3.5 text-muted-foreground" />;
  }
}

export function TabBreaks({ shift }: { shift: ShiftDetailData }) {
  const t = useTranslations("screen.shiftDetail");

  const typeLabel = (type: "lunch" | "rest" | "custom") => {
    if (type === "lunch") return t("breaks.type_lunch");
    if (type === "rest") return t("breaks.type_rest");
    return t("breaks.type_custom");
  };

  if (!shift.breaks || shift.breaks.length === 0) {
    return (
      <EmptyState
        icon={Coffee}
        title={t("breaks.no_breaks")}
        description=""
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-2">
      {shift.breaks.map((brk, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            {breakTypeIcon(brk.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{typeLabel(brk.type)}</p>
            <p className="text-xs text-muted-foreground">
              {brk.from} → {brk.to}
            </p>
          </div>
          <span className="text-sm text-muted-foreground shrink-0 font-mono">
            {brk.from}–{brk.to}
          </span>
        </div>
      ))}
    </div>
  );
}
