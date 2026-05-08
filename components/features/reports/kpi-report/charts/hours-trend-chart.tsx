import type { useTranslations } from "next-intl";
import { BarChart2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

import { ChartAiButton } from "../chart-ai-button";
import type { TrendDatum } from "../_shared";

interface HoursTrendChartProps {
  t: ReturnType<typeof useTranslations>;
  data: TrendDatum[];
  onChangePeriod: () => void;
}

export function HoursTrendChart({
  t,
  data,
  onChangePeriod,
}: HoursTrendChartProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {t("trends.hours_title")}
          </CardTitle>
          <ChartAiButton
            chartId="kpi-hours-trend"
            label={t("trends.hours_title")}
            t={t}
          />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title={t("empty.no_data_title")}
            description={t("empty.no_data_subtitle")}
            action={{
              label: "Сменить период",
              onClick: onChangePeriod,
            }}
          />
        ) : (
          <ResponsiveContainer width="100%" height={240} className="md:!h-[300px]">
            <LineChart
              data={data}
              margin={{ top: 4, right: 20, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="plan"
                name={t("trends.plan_line")}
                stroke="var(--color-muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="actual"
                name={t("trends.actual_line")}
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="deviation"
                name={t("trends.deviation_line")}
                stroke="var(--color-chart-3)"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
