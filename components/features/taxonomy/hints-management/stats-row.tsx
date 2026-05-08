"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { HintsCoverage } from "@/lib/api/hints";

interface StatsRowProps {
  coverage: HintsCoverage | null;
  statsLoading: boolean;
  onViewEmptyList?: () => void;
}

export function StatsRow({ coverage, statsLoading, onViewEmptyList }: StatsRowProps) {
  const t = useTranslations("screen.hints");

  const coveredPairs = coverage?.covered_pairs ?? 0;
  const totalPairs = coverage?.total_pairs ?? 60;
  const emptyPairs = coverage ? totalPairs - coveredPairs : 12;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Total hints */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{t("stats.total_hints")}</p>
          {statsLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight text-foreground mt-0.5">
              {coverage?.total_hints ?? 30}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Covered pairs */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{t("stats.covered_pairs")}</p>
          {statsLoading ? (
            <Skeleton className="h-7 w-24 mt-1" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight text-foreground mt-0.5">
              {t("stats.coverage_format", { covered: coveredPairs, total: totalPairs })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Empty pairs */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{t("stats.empty_pairs")}</p>
          {statsLoading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-2xl font-semibold tracking-tight text-warning">
                {emptyPairs}
              </p>
              <button
                className="text-xs text-primary hover:underline"
                onClick={onViewEmptyList}
              >
                {t("stats.view_empty_list")}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
