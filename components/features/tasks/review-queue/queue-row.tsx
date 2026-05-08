"use client"

import * as React from "react"
import { Camera, Clock } from "lucide-react"

import type { TaskWithAvatar } from "@/lib/api/tasks"
import { cn } from "@/lib/utils"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { fmtRelative, fmtWaitTime, getInitials, type TFn } from "./_shared"

export interface QueueRowProps {
  task: TaskWithAvatar
  isSelected: boolean
  onClick: () => void
  t: TFn
  locale: string
}

export function QueueRow({ task, isSelected, onClick, t, locale }: QueueRowProps) {
  const waitTime = task.updated_at ? fmtWaitTime(task.updated_at, t) : "—"
  const completedAt = task.history_brief?.completed_at
    ? fmtRelative(task.history_brief.completed_at, locale)
    : null
  const subtitle = [task.store_name, task.zone_name, task.work_type_name].filter(Boolean).join(" / ")

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full max-w-full overflow-hidden p-3 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "min-h-[44px]",
        isSelected
          ? "border-primary bg-accent"
          : "border-border/40 hover:border-border hover:bg-muted/30"
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="size-7 shrink-0">
            <AvatarImage src={task.assignee_avatar} alt={task.assignee_name ?? ""} />
            <AvatarFallback className="text-xs bg-accent text-accent-foreground">
              {task.assignee_name ? getInitials(task.assignee_name) : "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium truncate min-w-0">{task.assignee_name ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-muted-foreground whitespace-nowrap">
          <Clock className="size-3" />
          <span className="text-xs">{waitTime}</span>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-medium line-clamp-2 mb-1 text-foreground break-words">
        {task.title}
      </p>

      {/* Subtitle — 2 строки max с переносом слов; title= для полного текста на hover */}
      <p
        className="text-xs text-muted-foreground mb-1.5 max-w-full line-clamp-2 break-words"
        title={subtitle}
      >
        {subtitle}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          {task.requires_photo && <Camera className="size-3 text-muted-foreground" />}
        </div>
        {completedAt && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">{completedAt}</span>
        )}
      </div>
    </button>
  )
}
