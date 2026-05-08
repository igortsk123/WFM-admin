"use client"

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

interface OverviewWeekChartProps {
  data: Array<{ label: string; plan: number; fact: number }>
}

export function OverviewWeekChart({ data }: OverviewWeekChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={2} barCategoryGap="25%">
        <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ fill: "var(--color-muted)", radius: 4 }}
        />
        <Bar dataKey="plan" name="План" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="fact" name="Факт" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
