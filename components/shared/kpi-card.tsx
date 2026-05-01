"use client"

import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string | number
  /** Positive number = success (up), negative = destructive (down) */
  diff?: number
  /** Array of numeric data points for sparkline */
  trend?: number[]
  icon?: LucideIcon
  className?: string
}

export function KpiCard({
  label,
  value,
  diff,
  trend,
  icon: Icon,
  className,
}: KpiCardProps) {
  const isPositive = diff !== undefined && diff > 0
  const isNegative = diff !== undefined && diff < 0

  const sparkData = trend?.map((v, i) => ({ i, v }))

  return (
    <Card className={cn("rounded-xl", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {Icon && (
                <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
              )}
              <span className="text-sm font-medium text-muted-foreground truncate">
                {label}
              </span>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-2xl font-semibold tracking-tight text-foreground">
                {value}
              </span>

              {diff !== undefined && diff !== 0 && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-sm font-medium mb-0.5",
                    isPositive && "text-success",
                    isNegative && "text-destructive"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="size-3.5" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="size-3.5" aria-hidden="true" />
                  )}
                  {isPositive ? "+" : ""}
                  {diff}%
                </span>
              )}
            </div>
          </div>

          {sparkData && sparkData.length > 1 && (
            <div className="shrink-0 w-20 h-8" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
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
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
