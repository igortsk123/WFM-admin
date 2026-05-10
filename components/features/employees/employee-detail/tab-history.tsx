"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, FileText } from "lucide-react"

import type { UserDetail, UserHistoryEvent } from "@/lib/api"
import { getUserHistoryEvents } from "@/lib/api"

import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/shared"

import type { FormatTime } from "./_shared"

interface EmployeeHistoryTabProps {
  user: UserDetail
  locale: string
  formatTime: FormatTime
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

export function EmployeeHistoryTab({ user, locale, formatTime, t }: EmployeeHistoryTabProps) {
  const [events, setEvents] = useState<UserHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getUserHistoryEvents(user.id)
      .then((res) => {
        if (cancelled) return
        setEvents(res.data)
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="text-sm text-muted-foreground">…</div>
        </CardContent>
      </Card>
    )
  }

  if (events.length === 0) {
    return <EmptyState icon={FileText} title={t("history.empty")} description="" />
  }

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <ol className="flex flex-col">
          {events.map((item, idx) => (
            <li key={item.id} className="flex gap-3 group">
              <div className="flex flex-col items-center shrink-0">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted mt-0.5">
                  <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                </span>
                {idx < events.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 mb-1" aria-hidden="true" />
                )}
              </div>
              <div className={`flex flex-col gap-0.5 pb-4 min-w-0 flex-1 ${idx === events.length - 1 ? "pb-0" : ""}`}>
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
