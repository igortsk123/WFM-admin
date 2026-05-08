"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Star, Wand2, ChevronRight } from "lucide-react"

import type { EmployeeUtilization } from "@/lib/api/distribution"
import { cn } from "@/lib/utils"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

import {
  formatHM,
  getFullName,
  getInitials,
  getUtilizationColor,
  getUtilizationTextColor,
} from "./_utils"

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeUtilizationRow
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeeUtilizationRowProps {
  employee: EmployeeUtilization
  planMin?: number
  onSelect?: () => void
  t: ReturnType<typeof useTranslations>
}

export function EmployeeUtilizationRow({ employee, planMin = 0, onSelect, t }: EmployeeUtilizationRowProps) {
  const fullName = getFullName(employee.user.first_name, employee.user.last_name)
  const effectiveAssigned = employee.assigned_min + planMin
  const effectivePct = employee.shift_total_min > 0
    ? Math.round((effectiveAssigned / employee.shift_total_min) * 100)
    : 0
  const serverPct = employee.shift_total_min > 0
    ? (employee.assigned_min / employee.shift_total_min) * 100
    : 0
  const planPct = employee.shift_total_min > 0
    ? (planMin / employee.shift_total_min) * 100
    : 0
  const assignedLabel = formatHM(effectiveAssigned, t)
  const totalLabel = formatHM(employee.shift_total_min, t)

  const content = (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={employee.user.avatar_url} alt={fullName} />
        <AvatarFallback className="text-xs bg-accent text-accent-foreground">
          {getInitials(employee.user.first_name, employee.user.last_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{fullName}</span>
          {planMin > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary text-primary">
              <Wand2 className="size-2.5 mr-0.5" />
              +{formatHM(planMin, t)}
            </Badge>
          )}
          {employee.has_bonus_task && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              <Star className="size-2.5 mr-0.5" />
              {t("utilization.bonus_badge")}
            </Badge>
          )}
        </div>
        {/* Stacked bar: saved (primary) + planned (primary/40), как в TaskCard.
            Цвет fill отражает effectivePct (saved+plan) — после auto бар сразу
            визуально показывает «как будет после подтверждения». */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className={cn("h-full transition-all", getUtilizationColor(effectivePct))}
              style={{ width: `${Math.min(serverPct, 100)}%` }}
            />
            <div
              className="h-full bg-primary/40 transition-all"
              style={{ width: `${Math.max(0, Math.min(planPct, 100 - serverPct))}%` }}
            />
          </div>
          <span className={cn("text-xs font-medium shrink-0", getUtilizationTextColor(effectivePct))}>
            {effectivePct}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("utilization.hours_format", { assigned: assignedLabel, total: totalLabel })}
        </span>
      </div>
    </>
  )

  if (onSelect) {
    // Карточка во всю ширину — primary action в LEFT-панели.
    return (
      <Card
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
        className={cn(
          "group cursor-pointer transition-all hover:shadow-md hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          planMin > 0 && "ring-1 ring-primary",
        )}
      >
        <CardContent className="flex items-center gap-3 p-3">
          {content}
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    )
  }

  // Read-only — компактная строка для RIGHT-панели.
  return <div className="flex items-center gap-3 py-2">{content}</div>
}
