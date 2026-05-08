"use client";

import { useMemo, useState } from "react";
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { StoreComparisonRow, StoreQuadrant } from "@/lib/api/reports";

import {
  type T,
  type MetricKey,
  SCATTER_METRIC_OPTS,
} from "../_shared";

interface ScatterChartViewProps {
  stores: StoreComparisonRow[];
  medians: { completion_rate: number; return_rate: number; on_time_rate: number };
  t: T;
}

// Custom dot for scatter
function CustomScatterDot(props: {
  cx?: number;
  cy?: number;
  r?: number;
  payload?: StoreComparisonRow & { xVal: number; yVal: number };
  onClick?: () => void;
}) {
  const { cx = 0, cy = 0, r = 12, payload, onClick } = props;
  const color =
    payload?.quadrant === "LEADERS"
      ? "var(--color-success)"
      : payload?.quadrant === "DECLINING"
        ? "var(--color-warning)"
        : payload?.quadrant === "GROWING"
          ? "var(--color-accent-foreground)"
          : "var(--color-muted-foreground)";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={color}
      fillOpacity={0.75}
      stroke={color}
      strokeWidth={1.5}
      cursor="pointer"
      onClick={onClick}
    />
  );
}

// Custom scatter tooltip
function ScatterDotTooltip({
  active,
  payload,
  xMetric,
  yMetric,
  t,
}: {
  active?: boolean;
  payload?: Array<{
    payload: StoreComparisonRow & { xVal: number; yVal: number; zVal: number };
  }>;
  xMetric: MetricKey;
  yMetric: MetricKey;
  t: T;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-xs space-y-1 max-w-[200px]">
      <p className="font-semibold text-sm leading-snug">{data.store_name}</p>
      <p className="text-muted-foreground">
        {t(`metric.${xMetric}`)}: {data.xVal}%
      </p>
      <p className="text-muted-foreground">
        {t(`metric.${yMetric}`)}: {data.yVal}%
      </p>
    </div>
  );
}

export function ScatterChartView({ stores, medians: _medians, t }: ScatterChartViewProps) {
  const router = useRouter();
  const [xMetric, setXMetric] = useState<MetricKey>("completion_rate");
  const [yMetric, setYMetric] = useState<MetricKey>("on_time_rate");
  const [sizeMetric, setSizeMetric] = useState<MetricKey>("hours_diff_pct");

  const scatterData = useMemo(
    () =>
      stores.map((s) => ({
        ...s,
        xVal: s[xMetric] as number,
        yVal: s[yMetric] as number,
        zVal: Math.max(20, Math.abs(s[sizeMetric] as number) * 10 + 20),
      })),
    [stores, xMetric, yMetric, sizeMetric],
  );

  const xValues = scatterData.map((d) => d.xVal);
  const yValues = scatterData.map((d) => d.yVal);
  const xMedian =
    stores.map((s) => s[xMetric] as number).sort((a, b) => a - b)[
      Math.floor(stores.length / 2)
    ] ?? 0;
  const yMedian =
    stores.map((s) => s[yMetric] as number).sort((a, b) => a - b)[
      Math.floor(stores.length / 2)
    ] ?? 0;
  const xMin = Math.min(...xValues) - 2;
  const xMax = Math.max(...xValues) + 2;
  const yMin = Math.min(...yValues) - 2;
  const yMax = Math.max(...yValues) + 2;

  return (
    <div className="space-y-4">
      {/* Axis selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground font-medium">
                {t("scatter_view.x_axis_label")}
              </label>
              <Select value={xMetric} onValueChange={(v) => setXMetric(v as MetricKey)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCATTER_METRIC_OPTS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`metric.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground font-medium">
                {t("scatter_view.y_axis_label")}
              </label>
              <Select value={yMetric} onValueChange={(v) => setYMetric(v as MetricKey)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCATTER_METRIC_OPTS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`metric.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground font-medium">
                {t("scatter_view.size_label")}
              </label>
              <Select value={sizeMetric} onValueChange={(v) => setSizeMetric(v as MetricKey)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCATTER_METRIC_OPTS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`metric.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scatter chart */}
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[340px] h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsScatterChart margin={{ top: 24, right: 40, left: 8, bottom: 24 }}>
              <defs>
                <clipPath id="quadrant-tr">
                  <rect x="0%" y="0%" width="100%" height="50%" />
                </clipPath>
                <clipPath id="quadrant-bl">
                  <rect x="0%" y="50%" width="100%" height="50%" />
                </clipPath>
              </defs>

              <XAxis
                type="number"
                dataKey="xVal"
                name={t(`metric.${xMetric}`)}
                domain={[xMin, xMax]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: t(`metric.${xMetric}`),
                  position: "insideBottom",
                  offset: -12,
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <YAxis
                type="number"
                dataKey="yVal"
                name={t(`metric.${yMetric}`)}
                domain={[yMin, yMax]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: t(`metric.${yMetric}`),
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <ZAxis type="number" dataKey="zVal" range={[200, 800]} />
              <RechartsTooltip
                content={<ScatterDotTooltip xMetric={xMetric} yMetric={yMetric} t={t} />}
              />

              {/* Median reference lines */}
              <ReferenceLine
                x={xMedian}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
              <ReferenceLine
                y={yMedian}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 3"
                strokeWidth={1}
              />

              <Scatter
                data={scatterData}
                shape={(props: unknown) => {
                  const p = props as {
                    cx?: number;
                    cy?: number;
                    r?: number;
                    payload?: StoreComparisonRow & { xVal: number; yVal: number };
                  };
                  return (
                    <CustomScatterDot
                      {...p}
                      onClick={() =>
                        router.push(
                          ADMIN_ROUTES.storeDetail(
                            String(p.payload?.store_id ?? ""),
                          ) as never,
                        )
                      }
                    />
                  );
                }}
              >
                {scatterData.map((entry) => (
                  <Cell
                    key={entry.store_id}
                    fill={
                      entry.quadrant === "LEADERS"
                        ? "var(--color-success)"
                        : entry.quadrant === "DECLINING"
                          ? "var(--color-warning)"
                          : "var(--color-muted-foreground)"
                    }
                  />
                ))}
              </Scatter>
            </RechartsScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quadrant legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(["LEADERS", "GROWING", "STABLE", "DECLINING"] as StoreQuadrant[]).map((q) => (
          <span key={q} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-3 rounded-full inline-block",
                q === "LEADERS"
                  ? "bg-success"
                  : q === "DECLINING"
                    ? "bg-warning"
                    : q === "GROWING"
                      ? "bg-accent-foreground"
                      : "bg-muted-foreground",
              )}
            />
            {t(`comparison_badge.${q}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
