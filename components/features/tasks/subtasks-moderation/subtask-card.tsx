"use client"

import { useLocale } from "next-intl"
import { ChevronDown } from "lucide-react"

import type { OperationWithTaskTitle } from "@/lib/api/tasks"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { SourceBadge } from "./source-badge"
import { ExpandedBody } from "./expanded-body"
import { getInitials, relativeTime } from "./_shared"

interface SubtaskCardProps {
  subtask: OperationWithTaskTitle
  isExpanded: boolean
  onToggle: () => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

export function SubtaskCard({ subtask, isExpanded, onToggle, onApprove, onReject }: SubtaskCardProps) {
  const locale = useLocale()
  const p = subtask.proposed_by

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card transition-colors cursor-pointer",
        "hover:bg-accent",
        isExpanded && "bg-accent/50"
      )}
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      {/* Card header — always visible */}
      <div className="flex items-start gap-3 p-4 min-h-[44px]">
        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Top row: source badge */}
          <div className="flex items-center justify-between gap-2">
            <SourceBadge source={subtask.suggestion_source} />
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>

          {/* Subtask name */}
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-relaxed">
            {subtask.name}
          </p>

          {/* Chips: work type + zone */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="secondary"
              className="text-xs font-normal px-2 py-0.5 rounded-md"
            >
              {subtask.work_type_name}
            </Badge>
            {subtask.zone_name && subtask.zone_name !== "—" && (
              <Badge
                variant="outline"
                className="text-xs font-normal px-2 py-0.5 rounded-md"
              >
                {subtask.zone_name}
              </Badge>
            )}
          </div>

          {/* Author row */}
          {p && (
            <div className="flex items-center gap-2 pt-0.5">
              <Avatar className="size-6 shrink-0">
                <AvatarImage src={(p as { avatar_url?: string }).avatar_url} alt={`${p.first_name} ${p.last_name}`} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(p.first_name, p.last_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {p.last_name} {p.first_name}
                {p.middle_name ? ` ${p.middle_name[0]}.` : ""}
                {" · "}
                {subtask.created_at ? relativeTime(subtask.created_at, locale) : "—"}
              </span>
            </div>
          )}

          {/* Store + frequency for worker-sourced subtasks */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">{subtask.store_name}</span>
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <ExpandedBody
          subtask={subtask}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    </div>
  )
}
