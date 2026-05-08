"use client";

import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { RiskMetrics } from "@/lib/api/risk";

interface MetricsTabProps {
  metrics: RiskMetrics | null;
  loading: boolean;
}

export function MetricsTab({ metrics, loading }: MetricsTabProps) {
  const t = useTranslations("screen.riskRules");

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!metrics) return null;

  const chartProps = {
    margin: { top: 8, right: 8, left: -20, bottom: 0 },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Defect rate chart */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("metrics_tab.defect_rate_chart_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 w-full" aria-label={t("metrics_tab.defect_rate_chart_title")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trend_defect} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(d: string) => d.slice(5)}
                  interval={14}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${v}%`, "Defect rate"]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => String(l)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Review time chart */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("metrics_tab.review_time_chart_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 w-full" aria-label={t("metrics_tab.review_time_chart_title")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trend_review_time} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(d: string) => d.slice(5)}
                  interval={14}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => `${v} мин`}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${v} мин`, "Время проверки"]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => String(l)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top defective work types */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("metrics_tab.top_defective_card_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("metrics_tab.top_defective_columns.work_type")}</TableHead>
                  <TableHead>{t("metrics_tab.top_defective_columns.defect_rate")}</TableHead>
                  <TableHead>{t("metrics_tab.top_defective_columns.tasks_count")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.top_defective_work_types.map((row) => (
                  <TableRow key={row.work_type_id}>
                    <TableCell className="font-medium">{row.work_type_name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-destructive font-semibold">
                        {row.defect_rate_pct}%
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.tasks_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
