import type { useTranslations } from "next-intl";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
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
import { useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { PlanFactReportData } from "@/lib/api/reports";

import { calcDeltaPct, formatDeltaPct, formatDate, getDeltaHoursClass } from "./_shared";
import { ChartAiButton } from "./chart-ai-button";

export function DaysTab({
  data,
  t,
}: {
  data: PlanFactReportData;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();

  const chartData = data.days.map((d) => ({
    label: formatDate(d.date),
    date: d.date,
    plan: d.planned_hours,
    fact: d.actual_hours,
    deviation: calcDeltaPct(d.planned_hours, d.actual_hours),
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">
            {t("days_tab.chart_title")}
          </CardTitle>
          <ChartAiButton chartId="plan-fact-by-days" t={t} />
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <ResponsiveContainer width="100%" height={400} className="md:h-[400px] h-[240px]">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis
                yAxisId="hours"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: t("chart.hours_axis"),
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
                }}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={((value: number, name: string) => {
                  if (name === t("chart.deviation_pct")) return [`${value}%`, name];
                  return [`${value} ч`, name];
                }) as never}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="hours"
                dataKey="plan"
                name={t("chart.planned")}
                fill="var(--color-chart-2)"
                radius={[3, 3, 0, 0]}
                barSize={8}
              />
              <Bar
                yAxisId="hours"
                dataKey="fact"
                name={t("chart.actual")}
                fill="var(--color-chart-1)"
                radius={[3, 3, 0, 0]}
                barSize={8}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="deviation"
                name={t("chart.deviation_pct")}
                stroke="var(--color-warning)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 2"
              />
              <ReferenceLine yAxisId="pct" y={0} stroke="var(--color-border)" strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{t("days_tab.table_title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">{t("days_tab.col_date")}</TableHead>
                  <TableHead className="w-12 hidden sm:table-cell">{t("days_tab.col_weekday")}</TableHead>
                  <TableHead className="text-right">{t("days_tab.col_planned")}</TableHead>
                  <TableHead className="text-right">{t("days_tab.col_actual")}</TableHead>
                  <TableHead className="text-right">{t("days_tab.col_delta")}</TableHead>
                  <TableHead className="text-right">{t("days_tab.col_delta_pct")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("days_tab.col_tasks_plan")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("days_tab.col_tasks_fact")}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t("days_tab.col_completion")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.days.map((day) => {
                  const delta = day.actual_hours - day.planned_hours;
                  const deltaPct = calcDeltaPct(day.planned_hours, day.actual_hours);
                  return (
                    <TableRow
                      key={day.date}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={(e) => {
                        const path = `${ADMIN_ROUTES.tasks}?from=${day.date}&to=${day.date}`;
                        if (e.metaKey || e.ctrlKey) {
                          window.open(path, "_blank");
                        } else {
                          router.push(path as never);
                        }
                      }}
                    >
                      <TableCell className="font-medium text-sm">
                        {formatDate(day.date)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        {day.weekday}
                      </TableCell>
                      <TableCell className="text-right text-sm">{day.planned_hours}</TableCell>
                      <TableCell className="text-right text-sm">{day.actual_hours}</TableCell>
                      <TableCell className={cn("text-right text-sm", getDeltaHoursClass(deltaPct))}>
                        {delta > 0 ? `+${delta}` : delta}
                      </TableCell>
                      <TableCell className={cn("text-right text-sm", getDeltaHoursClass(deltaPct))}>
                        {formatDeltaPct(deltaPct)}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">{day.planned_tasks}</TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">{day.completed_tasks}</TableCell>
                      <TableCell className="text-right text-sm hidden lg:table-cell">
                        {day.completion_rate}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
