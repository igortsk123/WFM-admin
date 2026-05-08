"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Users, ChevronDown, ChevronRight } from "lucide-react"

import type { EmployeeUtilization } from "@/lib/api/distribution"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { EmployeeUtilizationRow } from "./employee-row"

// ─────────────────────────────────────────────────────────────────────────────
// MobileUtilizationCollapsible
// ─────────────────────────────────────────────────────────────────────────────

export interface MobileUtilizationCollapsibleProps {
  employees: EmployeeUtilization[]
  planMinByUser: Map<number, number>
  isLoading: boolean
  date: string
  t: ReturnType<typeof useTranslations>
  locale: string
}

export function MobileUtilizationCollapsible(props: MobileUtilizationCollapsibleProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="lg:hidden">
      <Card>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <span className="text-sm font-medium">{props.t("utilization.title")}</span>
              <Badge variant="secondary" className="text-xs">
                {props.employees.length}
              </Badge>
            </div>
            {open ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t pt-3">
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1">
                {props.employees.map((emp) => (
                  <EmployeeUtilizationRow
                    key={emp.user.id}
                    employee={emp}
                    planMin={props.planMinByUser.get(emp.user.id) ?? 0}
                    t={props.t}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
