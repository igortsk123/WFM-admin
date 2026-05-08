"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

import { PLAN_FACT_DATA } from "./_shared"

export function PlanFactChart() {
  const t = useTranslations("screen.dashboard.plan_fact")
  const [period, setPeriod] = useState<"day" | "week" | "month">("week")

  const chartConfig: ChartConfig = {
    plan: {
      label: t("plan"),
      color: "oklch(var(--muted-foreground))",
    },
    fact: {
      label: t("fact"),
      color: "oklch(var(--primary))",
    },
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-7 text-xs"
              >
                {t(`period.${p}` as Parameters<typeof t>[0])}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] md:h-[280px] w-full">
          <BarChart data={PLAN_FACT_DATA} barGap={4}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="plan"
              fill="var(--color-plan)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="fact"
              fill="var(--color-fact)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
