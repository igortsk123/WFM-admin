"use client"

import { useTranslations } from "next-intl"
import { CheckCircle2, FileText } from "lucide-react"

import type { UserDetail } from "@/lib/api/users"

import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared"

import type { FormatTime } from "./_shared"

interface EmployeeHistoryTabProps {
  user: UserDetail
  locale: string
  formatTime: FormatTime
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

const MOCK_HISTORY = [
  { id: "h1", occurred_at: "2026-04-15T10:22:00Z", actor: "Романов И. А.", action_label: "Назначена привилегия SELF_CHECKOUT", type: "permission_granted" },
  { id: "h2", occurred_at: "2024-09-01T09:00:00Z", actor: "Иванов А. С.",  action_label: "Назначена привилегия SELF_CHECKOUT", type: "permission_granted" },
  { id: "h3", occurred_at: "2024-03-20T08:30:00Z", actor: "Романов И. А.", action_label: "Назначены привилегии CASHIER, SALES_FLOOR", type: "permission_granted" },
  { id: "h4", occurred_at: "2024-03-15T07:00:00Z", actor: "Системная миграция", action_label: "Сотрудник добавлен в систему", type: "system" },
]

export function EmployeeHistoryTab({ user: _user, locale, formatTime, t }: EmployeeHistoryTabProps) {
  if (MOCK_HISTORY.length === 0) {
    return <EmptyState icon={FileText} title={t("history.empty")} description="" />
  }
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <ol className="flex flex-col">
          {MOCK_HISTORY.map((item, idx) => (
            <li key={item.id} className="flex gap-3 group">
              <div className="flex flex-col items-center shrink-0">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted mt-0.5">
                  <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                </span>
                {idx < MOCK_HISTORY.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 mb-1" aria-hidden="true" />
                )}
              </div>
              <div className={`flex flex-col gap-0.5 pb-4 min-w-0 flex-1 ${idx === MOCK_HISTORY.length - 1 ? "pb-0" : ""}`}>
                <p className="text-sm text-foreground">
                  <span className="font-medium">{item.actor}</span>
                  {" — "}
                  {item.action_label}
                </p>
                <time className="text-xs text-muted-foreground">
                  {formatTime(item.occurred_at, locale)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
