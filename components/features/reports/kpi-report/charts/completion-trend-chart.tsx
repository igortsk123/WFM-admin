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

interface CompletionTrendChartProps {
  t: ReturnType<typeof useTranslations>;
  data: TrendDatum[];
  onChangePeriod: () => void;
}

export function CompletionTrendChart({
  t,
  data,
  onChangePeriod,
}: CompletionTrendChartProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {t("trends.completion_title")}
          </CardTitle>
          <ChartAiButton
            chartId="kpi-completion-trend"
            label={t("trends.completion_title")}
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
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
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
                domain={[70, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <RechartsTooltip
                formatter={
                  ((v: number, name: string) => [
                    `${v.toFixed(1)}%`,
                    name,
                  ]) as never
                }
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
                type="monotone"
                dataKey="completion"
                name={t("trends.completion_line")}
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="on_time"
                name={t("trends.on_time_line")}
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
