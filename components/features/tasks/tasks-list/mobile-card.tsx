"use client"

import { useLocale } from "next-intl"
import { Shield } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { EntityMobileCard } from "@/components/shared/entity-mobile-card"
import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { UserCell } from "@/components/shared/user-cell"
import type { TaskWithAvatar } from "@/lib/api/tasks"

import { formatRelativeDate } from "./_shared"
import { SourceBadge } from "./source-badge"
import { RowActions } from "./row-actions"

interface MobileCardProps {
  task: TaskWithAvatar
  isSelected: boolean
  onToggleSelect: (id: string) => void
  isArchiveTab: boolean
}

export function MobileCard({
  task,
  isSelected,
  onToggleSelect,
  isArchiveTab,
}: MobileCardProps) {
  const locale = useLocale()

  return (
    <EntityMobileCard
      leading={
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(task.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
      }
      title={
        <span className="font-medium text-sm text-foreground line-clamp-2">
          {task.title}
        </span>
      }
      meta={[
        <>
          <TaskStateBadge state={task.state} size="sm" />
          {task.review_state !== "NONE" && (
            <ReviewStateBadge reviewState={task.review_state} size="sm" />
          )}
          <SourceBadge task={task} />
        </>,
        <span key="store" className="text-xs text-muted-foreground truncate">
          {task.store_name}
        </span>,
      ]}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {task.assignee_id && task.assignee_name ? (
              <UserCell
                user={{
                  first_name: task.assignee_name.split(" ")[1] ?? "",
                  last_name: task.assignee_name.split(" ")[0] ?? "",
                  avatar_url: task.assignee_avatar,
                }}
                className="text-sm"
              />
            ) : task.assigned_to_permission ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="size-3.5" />
                {task.assigned_to_permission}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(task.created_at, locale)}
            </span>
            <RowActions task={task} isArchiveTab={isArchiveTab} triggerSize="size-11" />
          </div>
        </div>
      }
    />
  )
}
