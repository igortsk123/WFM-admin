"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import {
  Archive as ArchiveIcon,
  ChevronLeft,
  Copy,
  MoreVertical,
  Pencil,
  RefreshCw,
  ShieldAlert,
  UserX,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { TouchInlineEdit } from "@/components/shared/touch-inline-edit"

import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { TaskDetail as TaskDetailType } from "@/lib/api/tasks"

import { TitleInlineEditButton } from "./title-inline-edit-button"

interface TaskDetailHeaderProps {
  task: TaskDetailType
  isOverdue: boolean
  isManager: boolean
  isStoreDirector: boolean
  isNetworkOps: boolean
  canTransfer: boolean
  onRefresh: () => void
  onTitleSave: (newTitle: string) => Promise<void>
  onTransferOpen: () => void
  onArchiveOpen: () => void
  onOverrideOpen: () => void
}

export function TaskDetailHeader({
  task,
  isOverdue,
  isManager,
  isStoreDirector,
  isNetworkOps,
  canTransfer,
  onRefresh,
  onTitleSave,
  onTransferOpen,
  onArchiveOpen,
  onOverrideOpen,
}: TaskDetailHeaderProps) {
  void isManager
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const router = useRouter()

  const breadcrumbs = [
    { label: t("breadcrumb_home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumb_tasks"), href: ADMIN_ROUTES.tasks },
    { label: task.title },
  ]

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={tCommon("actions")}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {/* Edit: STORE_DIRECTOR может редактировать только если task.editable_by_store=true
            (т.е. он сам её создал). Спущенные сверху задачи — read-only для него. */}
        {isStoreDirector && task.editable_by_store === false ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                  <Pencil className="size-4 mr-2" />
                  {t("action_edit")}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-48">{t("action_edit_disabled_hint")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <DropdownMenuItem onClick={() => router.push(ADMIN_ROUTES.taskEdit(task.id))}>
            <Pencil className="size-4 mr-2" />
            {t("action_edit")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push(`${ADMIN_ROUTES.taskNew}?duplicate=${task.id}`)}>
          <Copy className="size-4 mr-2" />
          {t("action_duplicate")}
        </DropdownMenuItem>
        {canTransfer && (
          <DropdownMenuItem onClick={onTransferOpen}>
            <UserX className="size-4 mr-2" />
            {t("action_transfer")}
          </DropdownMenuItem>
        )}
        {isNetworkOps && (
          <DropdownMenuItem onClick={onOverrideOpen}>
            <ShieldAlert className="size-4 mr-2" />
            {t("action_change_status")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onArchiveOpen}
        >
          <ArchiveIcon className="size-4 mr-2" />
          {t("action_archive")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb — desktop full, mobile back button */}
      <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true" className="text-muted-foreground/50">›</span>}
            {crumb.href ? (
              <a href={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</a>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      {/* Mobile back nav */}
      <div className="flex items-center gap-2 md:hidden">
        <Button variant="ghost" size="icon" className="size-9" onClick={() => router.push(ADMIN_ROUTES.tasks)} aria-label={tCommon("back")}>
          <ChevronLeft className="size-5" />
        </Button>
        <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <TaskStateBadge state={task.state} />
        {task.review_state !== "NONE" && <ReviewStateBadge reviewState={task.review_state} />}
        {isOverdue && (
          <Badge variant="destructive" className="text-xs">{t("badge_overdue")}</Badge>
        )}
        {task.type === "BONUS" && task.bonus_points && (
          <Badge className="bg-info text-info-foreground text-xs">{t("badge_bonus", { points: task.bonus_points })}</Badge>
        )}
        {task.kind === "CHAIN" && task.chain_position != null && (
          <Badge className="bg-muted text-muted-foreground text-xs">
            {t("badge_chain", { pos: task.chain_position, total: task.chain_position + 1 })}
          </Badge>
        )}
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Desktop: hover-pencil inline edit */}
          <div className="hidden md:flex items-center gap-2 group">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">{task.title}</h1>
            <TitleInlineEditButton title={task.title} onSave={onTitleSave} />
          </div>
          {/* Mobile: TouchInlineEdit */}
          <div className="md:hidden">
            <TouchInlineEdit
              value={task.title}
              onSave={onTitleSave}
              className="text-xl font-semibold"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="size-9" onClick={onRefresh} aria-label={t("action_refresh")}>
            <RefreshCw className="size-4" />
          </Button>
          {actionsMenu}
        </div>
      </div>
    </div>
  )
}
