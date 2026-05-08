"use client"

import * as React from "react"
import {
  ArrowUpRight,
  MoreVertical,
  AlertTriangle,
  Clock,
  User,
  Store,
  MapPin,
  Briefcase,
} from "lucide-react"

import type { TaskWithAvatar } from "@/lib/api/tasks"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

import { ReviewStateBadge } from "@/components/shared/review-state-badge"

import { calcActualMin, fmtMin, fmtRelative, getDeviationClass, type TFn } from "./_shared"

export interface PreviewPaneProps {
  task: TaskWithAvatar
  comment: string
  onCommentChange: (v: string) => void
  commentError: boolean
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
  isRejecting: boolean
  onOpenFull: () => void
  t: TFn
  locale: string
}

export function PreviewPane({
  task,
  comment,
  onCommentChange,
  commentError,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  onOpenFull,
  t,
  locale,
}: PreviewPaneProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const actualMin = calcActualMin(task)
  const hasPhoto = !!task.report_image_url
  const missingPhoto = task.requires_photo && !hasPhoto

  const QUICK_REASONS = [
    t("quick_reject_no_photo"),
    t("quick_reject_wrong_photo"),
    t("quick_reject_not_done"),
    t("quick_reject_overdue"),
  ]

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-lg font-semibold text-balance leading-tight">{task.title}</h2>
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={onOpenFull}
                    aria-label={t("open_full")}
                  >
                    <ArrowUpRight className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("open_full")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Действия">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onOpenFull}>
                  <ArrowUpRight className="size-4 mr-2" />
                  {t("open_full")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ReviewStateBadge reviewState="ON_REVIEW" size="sm" />
        </div>

        {/* Meta */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {task.assignee_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="size-3 shrink-0" />
              <span className="truncate">{task.assignee_name}</span>
            </div>
          )}
          {task.store_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="size-3 shrink-0" />
              <span className="truncate">{task.store_name}</span>
            </div>
          )}
          {task.zone_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{task.zone_name}</span>
            </div>
          )}
          {task.work_type_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="size-3 shrink-0" />
              <span className="truncate">{task.work_type_name}</span>
            </div>
          )}
          {task.history_brief?.completed_at && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3 shrink-0" />
              <span>{fmtRelative(task.history_brief.completed_at, locale)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Missing photo alert */}
      {missingPhoto && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">{t("photo_required_missing")}</AlertDescription>
        </Alert>
      )}

      {/* Photo */}
      {hasPhoto && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <button
            type="button"
            className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setLightboxOpen(true)}
            aria-label="Открыть фото"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={task.report_image_url!}
              alt="Фото отчёта"
              className="w-full aspect-video object-cover hover:opacity-90 transition-opacity"
              crossOrigin="anonymous"
            />
          </button>
        </div>
      )}

      {/* Timing */}
      {task.planned_minutes && (
        <div className="bg-card border rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("timing_plan")}</p>
              <p className="text-sm font-semibold">{fmtMin(task.planned_minutes)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("timing_actual")}</p>
              <p className={cn("text-sm font-semibold", actualMin !== null && getDeviationClass(task.planned_minutes, actualMin))}>
                {actualMin !== null ? fmtMin(actualMin) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("timing_deviation")}</p>
              <p className={cn(
                "text-sm font-semibold",
                actualMin !== null && getDeviationClass(task.planned_minutes, actualMin)
              )}>
                {actualMin !== null
                  ? `${actualMin - task.planned_minutes > 0 ? "+" : ""}${actualMin - task.planned_minutes} мин`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manager comment */}
      {task.comment && (
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("manager_comment")}</p>
          <p className="text-sm leading-relaxed">{task.comment}</p>
        </div>
      )}

      {/* Action bar */}
      <div className="bg-card border rounded-lg p-4 flex flex-col gap-3 mt-auto">
        {/* Quick reasons */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onCommentChange(reason)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs border transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                comment === reason ? "bg-accent border-primary" : "bg-background border-border"
              )}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <Textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder={t("comment_placeholder")}
          className={cn(
            "min-h-[72px] resize-none text-sm",
            commentError && "border-destructive focus-visible:ring-destructive"
          )}
          aria-label={t("comment_label")}
        />
        {commentError && (
          <p className="text-xs text-destructive -mt-2">{t("reject_comment_hint")}</p>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenFull}
            className="hidden md:flex"
          >
            {t("btn_open_full")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onReject}
            disabled={isRejecting || isApproving}
          >
            {isRejecting ? "..." : t("btn_reject")}
          </Button>
          <Button
            className="bg-success text-success-foreground hover:bg-success/90"
            size="sm"
            onClick={onApprove}
            disabled={isApproving || isRejecting}
          >
            {isApproving ? "..." : t("btn_approve")}
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {hasPhoto && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={task.report_image_url!}
              alt="Фото отчёта"
              className="w-full object-contain max-h-[80vh]"
              crossOrigin="anonymous"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
