"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatsBarStats {
  coverage: number;
  openShifts: number;
  planned: number;
  conflicts: number;
}

interface StatsBarProps {
  stats: StatsBarStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const t = useTranslations("screen.schedule");

  const coverageColor =
    stats.coverage >= 80
      ? "text-success"
      : stats.coverage >= 60
      ? "text-warning"
      : "text-destructive";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {/* Coverage */}
      <Card>
        <CardContent className="p-3 md:p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">
            {t("aggregates.coverage")}
          </span>
          <span className={`text-2xl font-semibold ${coverageColor}`}>
            {stats.coverage}%
          </span>
        </CardContent>
      </Card>
      {/* Open shifts */}
      <Card>
        <CardContent className="p-3 md:p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">
            {t("aggregates.open_shifts")}
          </span>
          <span className="text-2xl font-semibold text-foreground">
            {stats.openShifts}
          </span>
        </CardContent>
      </Card>
      {/* Planned hours */}
      <Card>
        <CardContent className="p-3 md:p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">
            {t("aggregates.total_planned")}
          </span>
          <span className="text-2xl font-semibold text-foreground">
            {stats.planned}
          </span>
        </CardContent>
      </Card>
      {/* Conflicts */}
      <Card>
        <CardContent className="p-3 md:p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">
            {t("aggregates.conflicts")}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-2xl font-semibold ${
                stats.conflicts > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {stats.conflicts}
            </span>
            {stats.conflicts > 0 && (
              <AlertTriangle
                className="size-4 text-destructive"
                aria-hidden="true"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
