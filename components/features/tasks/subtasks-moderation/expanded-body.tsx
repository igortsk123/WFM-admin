"use client"

import { useTranslations } from "next-intl"
import { Clock, ExternalLink } from "lucide-react"

import { Link } from "@/i18n/navigation"
import type { OperationWithTaskTitle } from "@/lib/api/tasks"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { Button } from "@/components/ui/button"

interface ExpandedBodyProps {
  subtask: OperationWithTaskTitle
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

export function ExpandedBody({ subtask, onApprove, onReject }: ExpandedBodyProps) {
  const t = useTranslations("screen.subtasksModeration")

  return (
    <div
      className="px-4 pb-4 pt-0 flex flex-col gap-4 border-t border-border mt-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Full subtask name */}
      <div className="pt-3">
        <p className="text-xs text-muted-foreground mb-0.5">{t("col_subtask")}</p>
        <p className="text-sm font-medium text-foreground">{subtask.name}</p>
      </div>

      {/* Linked task */}
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{t("expand_used_in_tasks")}</p>
        <Link
          href={ADMIN_ROUTES.taskDetail(subtask.task_id)}
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          target="_blank"
          rel="noreferrer"
        >
          <span>{subtask.task_title}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </Link>
      </div>

      {/* Duration + hints row */}
      <div className="flex items-center gap-6">
        {subtask.duration_min != null && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("col_duration")}</p>
            <span className="flex items-center gap-1 text-sm text-foreground">
              <Clock className="size-3.5 text-muted-foreground" />
              {t("duration_min", { min: subtask.duration_min })}
            </span>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("expand_hints")}</p>
          <p className="text-sm text-foreground">
            {subtask.hints_count > 0
              ? t("expand_hints_count", { count: subtask.hints_count })
              : t("expand_no_hints")}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1 h-11 bg-success text-success-foreground hover:bg-success/90"
          onClick={() => onApprove(subtask.id)}
        >
          {t("btn_approve")}
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-11 border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => onReject(subtask.id)}
        >
          {t("btn_reject")}
        </Button>
      </div>
    </div>
  )
}
