"use client"

import { LineChart, Line, ResponsiveContainer } from "recharts"

interface KpiCardSparklineProps {
  data: { i: number; v: number }[]
  isNegative: boolean
}

/**
 * Mini sparkline used inside KpiCard. Extracted into its own module so the
 * (~90 kB gz) recharts vendor chunk can be lazy-loaded only on screens that
 * actually render a trend — most KpiCards are rendered without one.
 */
export function KpiCardSparkline({ data, isNegative }: KpiCardSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={
            isNegative
              ? "var(--color-destructive)"
              : "var(--color-primary)"
          }
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
