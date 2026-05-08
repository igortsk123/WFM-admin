"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

interface InlineChartProps {
  payload: Record<string, unknown>;
}

export function InlineChart({ payload }: InlineChartProps) {
  const chartData =
    (payload.values as number[])?.map((value, idx) => ({
      name: (payload.labels as string[])?.[idx] || `${idx + 1}`,
      value,
    })) || [];
  const norm = payload.norm as number | undefined;
  const title = payload.title as string | undefined;

  return (
    <div className="mt-3 rounded-md border bg-background p-3">
      {title && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
          <RechartsTooltip
            contentStyle={{ fontSize: 12 }}
            labelStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          {norm !== undefined && (
            <ReferenceLine
              y={norm}
              stroke="hsl(var(--destructive))"
              strokeDasharray="4 4"
              label={{
                value: payload.norm_label as string || `${norm}`,
                position: "right",
                fontSize: 10,
                fill: "hsl(var(--destructive))",
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
