"use client";

import { useTranslations } from "next-intl";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PermissionPill } from "@/components/shared/permission-pill";

import type { PermissionCoverageRow } from "@/lib/api/users";

export function StatCard({ row }: { row: PermissionCoverageRow }) {
  const t = useTranslations("screen.permissions.stats");
  const sparkData = row.trend_30d.map((v, i) => ({ i, v }));
  const isPositive =
    (row.trend_30d[row.trend_30d.length - 1] ?? 0) > (row.trend_30d[0] ?? 0);

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-3 min-w-0 flex-1">
            <PermissionPill permission={row.permission} />
            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold tracking-tight text-foreground">
                {t("employees_count", { count: row.granted_count })}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("coverage", {
                  granted: row.granted_count,
                  total: row.eligible_count,
                  pct: row.coverage_pct,
                })}
              </span>
            </div>
            <Progress value={row.coverage_pct} className="h-1.5" />
          </div>
          <div className="shrink-0 w-20 h-10" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={
                    isPositive
                      ? "var(--color-success)"
                      : "var(--color-muted-foreground)"
                  }
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
