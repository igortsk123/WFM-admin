"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StoreComparisonRow } from "@/lib/api/reports";

import {
  type T,
  type MetricKey,
  HEATMAP_METRICS,
  getHeatmapBg,
} from "../_shared";

interface HeatmapChartProps {
  stores: StoreComparisonRow[];
  t: T;
}

export function HeatmapChart({ stores, t }: HeatmapChartProps) {
  const [sortByCode, setSortByCode] = useState(false);

  const sorted = useMemo(
    () =>
      sortByCode
        ? [...stores].sort((a, b) =>
            a.store_external_code.localeCompare(b.store_external_code),
          )
        : [...stores].sort((a, b) => a.rank - b.rank),
    [stores, sortByCode],
  );

  // Normalize metric value 0–1
  function normalize(value: number, key: MetricKey, inverted = false): number {
    const vals = stores.map((s) => s[key] as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max === min) return 0.5;
    const norm = (value - min) / (max - min);
    return inverted ? 1 - norm : norm;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto md:overflow-visible">
        <div
          className="min-w-[600px]"
          style={{ display: "grid", gridTemplateColumns: "200px repeat(5, 1fr)", gap: "2px" }}
          role="grid"
          aria-label="Тепловая карта метрик магазинов"
        >
          {/* Header row */}
          <button
            className="flex items-center gap-1 px-2 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 rounded-tl-lg hover:bg-muted/50 transition-colors text-left"
            onClick={() => setSortByCode((v) => !v)}
          >
            {t("table.columns.store")}
            <ChevronsUpDown className="size-3 opacity-50" />
          </button>
          {HEATMAP_METRICS.map(({ key }) => (
            <div
              key={key}
              className="px-2 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 text-center rounded-t-sm"
            >
              {t(`metric.${key}`)}
            </div>
          ))}

          {/* Data rows */}
          {sorted.map((row, rIdx) => (
            <Fragment key={row.store_id}>
              <div
                className={cn(
                  "px-3 py-2.5 text-xs font-medium leading-snug bg-card",
                  rIdx === sorted.length - 1 ? "rounded-bl-lg" : "",
                )}
              >
                <span className="text-muted-foreground font-mono mr-1.5 text-[10px]">
                  {row.store_external_code}
                </span>
                <br />
                <span className="line-clamp-2">{row.store_name.split(",")[0]}</span>
              </div>
              {HEATMAP_METRICS.map(({ key, inverted }, cIdx) => {
                const value = row[key] as number;
                const norm = normalize(value, key, inverted);
                const bgClass = getHeatmapBg(norm);
                const isLast =
                  rIdx === sorted.length - 1 && cIdx === HEATMAP_METRICS.length - 1;
                return (
                  <TooltipProvider key={`cell-${row.store_id}-${key}`} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center justify-center px-1 py-2 text-xs font-mono cursor-default transition-opacity hover:opacity-80",
                            bgClass,
                            isLast ? "rounded-br-lg" : "",
                          )}
                        >
                          {["hours_diff_pct", "fot_diff_pct"].includes(key) && value > 0 ? "+" : ""}
                          {value}
                          {["completion_rate", "return_rate", "on_time_rate"].includes(key) ? "%" : "%"}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                        <p className="font-medium">{row.store_name}</p>
                        <p className="text-muted-foreground">
                          {t(`metric.${key}`)}: {value}%
                        </p>
                        <p className="text-muted-foreground">
                          {t("heatmap.tooltip_rank", {
                            rank: sorted.indexOf(row) + 1,
                            total: sorted.length,
                          })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {t("common.legend") ?? "Легенда"}:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-success/20 inline-block border border-success/30" />
          {t("heatmap.legend_leaders")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-muted/50 inline-block border border-border" />
          {t("heatmap.legend_median")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-warning/20 inline-block border border-warning/30" />
          {t("heatmap.legend_support")}
        </span>
      </div>
    </div>
  );
}
