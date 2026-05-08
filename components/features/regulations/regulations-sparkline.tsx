"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface RegulationsSparklineProps {
  data: Array<{ i: number; v: number }>;
}

export function RegulationsSparkline({ data }: RegulationsSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
