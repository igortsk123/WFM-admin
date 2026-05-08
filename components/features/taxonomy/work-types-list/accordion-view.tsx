"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { cn } from "@/lib/utils"

import type { WorkTypeWithCount } from "@/lib/api/taxonomy"

import { RowActions } from "./row-actions"
import { GROUP_COLORS } from "./_shared"
import type { TFn } from "./_shared"

interface AccordionViewProps {
  groupedItems: Array<[string, WorkTypeWithCount[]]>
  onEdit: (wt: WorkTypeWithCount) => void
  onDuplicate: (wt: WorkTypeWithCount) => void
  onDelete: (wt: WorkTypeWithCount) => void
  t: TFn
  tCommon: TFn
}

export function WorkTypesAccordionView({
  groupedItems,
  onEdit,
  onDuplicate,
  onDelete,
  t,
  tCommon,
}: AccordionViewProps) {
  return (
    <Accordion type="multiple" className="space-y-2">
      {groupedItems.map(([group, groupItems]) => {
        const colors = GROUP_COLORS[group]
        return (
          <AccordionItem
            key={group}
            value={group}
            className="rounded-lg border border-border overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-3">
                <Badge
                  className="border-transparent"
                  style={
                    colors
                      ? { backgroundColor: colors.bg, color: colors.text }
                      : undefined
                  }
                >
                  {group}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {groupItems.length} типов
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-t border-border">
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {t("columns.code")}
                    </th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {t("columns.name")}
                    </th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {t("columns.default_duration")}
                    </th>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {t("columns.hints_count")}
                    </th>
                    <th className="px-4 py-2 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {groupItems.map((wt, i) => (
                    <tr
                      key={wt.id}
                      className={cn(
                        "border-t border-border hover:bg-muted/30 transition-colors cursor-pointer",
                        i % 2 === 1 && "bg-muted/10"
                      )}
                      onClick={() => onEdit(wt)}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                          {wt.code}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{wt.name}</td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {wt.default_duration_min}
                      </td>
                      <td className="px-4 py-2.5">
                        {wt.hints_count > 0 ? (
                          <Link
                            href={`${ADMIN_ROUTES.hints}?work_type_id=${wt.id}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {wt.hints_count}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActions
                          workType={wt}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          t={t}
                          tCommon={tCommon}
                          showDuplicateIcon={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
