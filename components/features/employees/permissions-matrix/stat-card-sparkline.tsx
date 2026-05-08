"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface StatCardSparklineProps {
  data: Array<{ i: number; v: number }>;
  isPositive: boolean;
}

export function StatCardSparkline({ data, isPositive }: StatCardSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
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
  );
}
