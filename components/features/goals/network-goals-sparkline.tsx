"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface NetworkGoalsSparklineProps {
  data: number[];
  isUp: boolean;
}

export function NetworkGoalsSparkline({ data, isUp }: NetworkGoalsSparklineProps) {
  const sparkData = data.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={sparkData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={isUp ? "var(--color-success)" : "var(--color-destructive)"}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
