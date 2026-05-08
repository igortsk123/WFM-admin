"use client";

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <span className="font-medium">{payload[0].value}</span>
      <span className="text-muted-foreground"> использований</span>
    </div>
  );
}

interface RegulationUsageChartProps {
  data: Array<{ day: string | number; uses: number }>;
}

export function RegulationUsageChart({ data }: RegulationUsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" hide />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="uses"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          fill="url(#usageGrad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
