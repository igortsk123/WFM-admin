import type { useTranslations } from "next-intl";
import { BarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { KpiReportData } from "@/lib/api/reports";

import { ChartAiButton } from "../chart-ai-button";

interface WorkTypeBarChartProps {
  t: ReturnType<typeof useTranslations>;
  data: KpiReportData["by_work_type"];
}

export function WorkTypeBarChart({ t, data }: WorkTypeBarChartProps) {
  const router = useRouter();
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {t("breakdown.work_type_title")}
          </CardTitle>
          <ChartAiButton
            chartId="kpi-by-work-type"
            label={t("breakdown.work_type_title")}
            t={t}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("breakdown.click_hint")}
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title={t("empty.no_data_title")}
            description={t("empty.no_data_subtitle")}
          />
        ) : (
          <ResponsiveContainer width="100%" height={240} className="md:!h-[300px]">
            <BarChart
              data={[...data].sort((a, b) => b.completion_rate - a.completion_rate)}
              margin={{ top: 4, right: 4, left: -20, bottom: 44 }}
              onClick={(d) => {
                const payload = (
                  d as
                    | {
                        activePayload?: Array<{ payload?: { id?: number } }>;
                      }
                    | undefined
                )?.activePayload?.[0]?.payload;
                if (payload?.id !== undefined) {
                  router.push(
                    `${ADMIN_ROUTES.tasks}?work_type_id=${payload.id}` as never
                  );
                }
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                domain={[60, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <RechartsTooltip
                formatter={
                  ((v: number) => [
                    `${v.toFixed(1)}%`,
                    t("breakdown.completion_label"),
                  ]) as never
                }
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: "var(--color-accent)", opacity: 0.4 }}
              />
              <Bar
                dataKey="completion_rate"
                fill="var(--color-chart-1)"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
