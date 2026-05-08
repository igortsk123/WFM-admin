import { useMemo } from "react";
import type { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PlanFactByWorkType, PlanFactReportData } from "@/lib/api/reports";

import { calcDeltaPct, formatDeltaPct, getDeltaHoursClass } from "./_shared";
import { ChartAiButton } from "./chart-ai-button";

export function WorkTypesTab({
  data,
  t,
}: {
  data: PlanFactReportData;
  t: ReturnType<typeof useTranslations>;
}) {
  const processed = useMemo(() =>
    (data.by_work_type as PlanFactByWorkType[])
      .map((wt) => ({
        ...wt,
        deltaPct: calcDeltaPct(wt.total_planned_hours, wt.total_actual_hours),
        deltaHours: wt.total_actual_hours - wt.total_planned_hours,
      }))
      .sort((a, b) => b.deltaPct - a.deltaPct),
    [data.by_work_type]
  );

  const chartData = processed.map((wt) => ({
    label: wt.work_type_name.length > 14 ? wt.work_type_name.slice(0, 13) + "…" : wt.work_type_name,
    plan: wt.total_planned_hours,
    fact: wt.total_actual_hours,
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">{t("chart.planned")} vs {t("chart.actual")}</CardTitle>
          <ChartAiButton chartId="plan-fact-by-work-types" t={t} />
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <ResponsiveContainer width="100%" height={400} className="md:h-[400px] h-[280px]">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={96}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={((value: number, name: string) => [`${value} ч`, name]) as never}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="plan"
                name={t("chart.planned")}
                fill="var(--color-chart-2)"
                radius={[0, 3, 3, 0]}
                barSize={10}
              />
              <Bar
                dataKey="fact"
                name={t("chart.actual")}
                fill="var(--color-chart-1)"
                radius={[0, 3, 3, 0]}
                barSize={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">{t("work_types_tab.col_work_type")}</TableHead>
                  <TableHead className="text-right">{t("work_types_tab.col_planned")}</TableHead>
                  <TableHead className="text-right">{t("work_types_tab.col_actual")}</TableHead>
                  <TableHead className="text-right">{t("work_types_tab.col_delta")}</TableHead>
                  <TableHead className="text-right">{t("work_types_tab.col_delta_pct")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("work_types_tab.col_tasks_done")}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t("work_types_tab.col_avg_duration")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processed.map((wt) => (
                  <TableRow key={wt.work_type_id}>
                    <TableCell className="font-medium text-sm">{wt.work_type_name}</TableCell>
                    <TableCell className="text-right text-sm">{wt.total_planned_hours}</TableCell>
                    <TableCell className="text-right text-sm">{wt.total_actual_hours}</TableCell>
                    <TableCell className={cn("text-right text-sm", getDeltaHoursClass(wt.deltaPct))}>
                      {wt.deltaHours > 0 ? `+${wt.deltaHours}` : wt.deltaHours}
                    </TableCell>
                    <TableCell className={cn("text-right text-sm", getDeltaHoursClass(wt.deltaPct))}>
                      {formatDeltaPct(wt.deltaPct)}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden md:table-cell">
                      {wt.total_completed_tasks}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden lg:table-cell">
                      {wt.avg_duration}
                    </TableCell>
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
