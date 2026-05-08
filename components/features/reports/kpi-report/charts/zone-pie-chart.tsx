import type { useTranslations } from "next-intl";
import { BarChart2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { KpiReportData } from "@/lib/api/reports";

import { ChartAiButton } from "../chart-ai-button";
import { PIE_COLORS } from "../_shared";

interface ZonePieChartProps {
  t: ReturnType<typeof useTranslations>;
  data: KpiReportData["by_zone"];
}

export function ZonePieChart({ t, data }: ZonePieChartProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {t("breakdown.zone_title")}
          </CardTitle>
          <ChartAiButton
            chartId="kpi-by-zone"
            label={t("breakdown.zone_title")}
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
          />
        ) : (
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
            <div className="w-full md:w-1/2">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="tasks_total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={
                      ((v: number, name: string) => [v, name]) as never
                    }
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              {data.map((zone, index) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{
                        background: PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-foreground truncate">
                      {zone.label}
                    </span>
                  </div>
                  <span className="text-muted-foreground shrink-0 font-medium">
                    {zone.completion_rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
