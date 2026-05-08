"use client"

import { useTranslations, useLocale } from "next-intl"
import { Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import type { TaskEvent } from "@/lib/types"
import type { TaskDetail as TaskDetailType } from "@/lib/api/tasks"

import { EVENT_DOT, fmtRelative } from "./_shared"

const HISTORY_PAGE = 20

interface TabHistoryProps {
  task: TaskDetailType
}

export function TabHistory({ task }: TabHistoryProps) {
  const t = useTranslations("screen.taskDetail")
  const locale = useLocale()

  function eventLabel(event: TaskEvent): string {
    const name = event.actor_name
    const payload = event.payload as Record<string, string>
    switch (event.event_type) {
      case "START": return t("event_started", { name })
      case "PAUSE": return t("event_paused", { name })
      case "RESUME": return t("event_resumed", { name })
      case "COMPLETE": return t("event_completed", { name })
      case "SEND_TO_REVIEW": return t("event_send_to_review", { name })
      case "AUTO_ACCEPT": return t("event_auto_accept")
      case "ACCEPT": return t("event_approved", { name })
      case "REJECT": return t("event_rejected", { reason: payload.reason ?? "—" })
      case "TRANSFER": return t("event_transfer", { name: payload.to_name ?? name })
      case "ARCHIVE": return t("event_archive", { reason: payload.reason ?? "—" })
      case "RESTORE": return t("event_restore")
      default: return t("event_updated")
    }
  }

  const visibleHistory = task.history.slice(0, HISTORY_PAGE)

  return (
    <div className="flex flex-col gap-0">
      {task.history.length === 0 ? (
        <EmptyState icon={Clock} title={t("history_empty_title")} description={t("history_empty_desc")} />
      ) : (
        <div className="relative ml-4 pl-6 border-l-2 border-muted flex flex-col gap-6 pb-4">
          {visibleHistory.map((event) => (
            <div key={event.id} className="relative flex gap-3">
              {/* Dot */}
              <span
                aria-hidden="true"
                className={cn("absolute -left-[31px] top-1.5 size-3 rounded-full border-2 border-background", EVENT_DOT[event.event_type] ?? "bg-muted")}
              />
              {/* Content */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm text-foreground leading-snug">{eventLabel(event)}</p>
                <p className="text-xs text-muted-foreground">{fmtRelative(event.occurred_at, locale)}</p>
                {(event.payload as Record<string, string>).note && (
                  <p className="text-xs text-muted-foreground italic line-clamp-3 mt-0.5">
                    {(event.payload as Record<string, string>).note}
                  </p>
                )}
              </div>
            </div>
          ))}
          {task.history.length > HISTORY_PAGE && (
            <Button variant="ghost" size="sm" className="self-start text-primary">
              {t("history_load_more")}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
