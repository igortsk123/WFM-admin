"use client"

import {
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArchiveIcon,
  MessageSquare,
  Users,
  Target,
  Sparkles,
  Bell,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"

export type ActivityType =
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "TASK_BLOCKED"
  | "TASK_ARCHIVED"
  | "COMMENT"
  | "EMPLOYEE"
  | "GOAL"
  | "AI"
  | "SYSTEM"

export interface ActivityItem {
  id: string
  timestamp: Date | string
  actor: string
  action: string
  type: ActivityType
  link?: string
}

const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  TASK_CREATED: PlusCircle,
  TASK_COMPLETED: CheckCircle2,
  TASK_BLOCKED: AlertCircle,
  TASK_ARCHIVED: ArchiveIcon,
  COMMENT: MessageSquare,
  EMPLOYEE: Users,
  GOAL: Target,
  AI: Sparkles,
  SYSTEM: Bell,
}

const TYPE_ICON_CLASS: Record<ActivityType, string> = {
  TASK_CREATED:   "text-info",
  TASK_COMPLETED: "text-success",
  TASK_BLOCKED:   "text-destructive",
  TASK_ARCHIVED:  "text-muted-foreground",
  COMMENT:        "text-muted-foreground",
  EMPLOYEE:       "text-muted-foreground",
  GOAL:           "text-warning",
  AI:             "text-primary",
  SYSTEM:         "text-muted-foreground",
}

interface ActivityFeedProps {
  items: ActivityItem[]
  className?: string
}

function formatRelative(date: Date | string, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (diffMin < 1) return rtf.format(0, "minute")
  if (diffMin < 60) return rtf.format(-diffMin, "minute")
  if (diffH < 24) return rtf.format(-diffH, "hour")
  if (diffD < 7) return rtf.format(-diffD, "day")
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d)
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  const locale = useLocale()

  if (items.length === 0) return null

  return (
    <ol className={cn("flex flex-col", className)} aria-label="Лента активности">
      {items.map((item, index) => {
        const Icon = TYPE_ICON[item.type]
        const iconClass = TYPE_ICON_CLASS[item.type]
        const isLast = index === items.length - 1

        return (
          <li key={item.id} className="flex gap-3 group">
            {/* Timeline line + icon */}
            <div className="flex flex-col items-center shrink-0">
              <span className="flex size-7 items-center justify-center rounded-full bg-muted mt-0.5">
                <Icon className={cn("size-3.5", iconClass)} aria-hidden="true" />
              </span>
              {!isLast && (
                <div className="w-px flex-1 bg-border mt-1 mb-1" aria-hidden="true" />
              )}
            </div>

            {/* Content */}
            <div className={cn("flex flex-col gap-0.5 pb-4 min-w-0 flex-1", isLast && "pb-0")}>
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-medium">{item.actor}</span>
                {" "}
                {item.link ? (
                  <Link
                    href={item.link}
                    className="text-primary hover:underline underline-offset-2"
                  >
                    {item.action}
                  </Link>
                ) : (
                  <span>{item.action}</span>
                )}
              </p>
              <time
                dateTime={
                  typeof item.timestamp === "string"
                    ? item.timestamp
                    : item.timestamp.toISOString()
                }
                className="text-xs text-muted-foreground"
              >
                {formatRelative(item.timestamp, locale)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
