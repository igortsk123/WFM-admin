"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import {
  RefreshCw, MoreVertical, Pencil, Copy, UserX, ShieldAlert, Archive as ArchiveIcon,
  MessageSquare, FileText, User, MapPin, Store, Clock, CheckCircle2, XCircle,
  ChevronLeft, ChevronDown, Download, Send, Plus, Trash2,
  AlertTriangle, FileQuestion, Lightbulb, LayoutGrid,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { UserCell } from "@/components/shared/user-cell"
import { TouchInlineEdit } from "@/components/shared/touch-inline-edit"
import { EmptyState } from "@/components/shared/empty-state"

import { ApproveDialogContent } from "./approve-dialog-content"
import { RejectDialogContent } from "./reject-dialog-content"
import { ArchiveDialogContent } from "./archive-dialog-content"
import { TransferDialogContent } from "./transfer-dialog-content"
import { SubtaskAddDialogContent } from "./subtask-add-dialog-content"
import { SubtaskSuggestEditDialogContent } from "./subtask-suggest-edit-dialog-content"
import { StatusOverrideDialogContent } from "./status-override-dialog-content"
import { AssignDialogContent } from "./assign-dialog-content"

import {
  getTaskById,
  approveTask,
  rejectTask,
  archiveTask,
  transferTask,
  updateTask,
  addSubtaskToTask,
  removeSubtask,
} from "@/lib/api/tasks"
import type { TaskDetail as TaskDetailType } from "@/lib/api/tasks"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"
import type { ArchiveReason, TaskState, SubtaskReviewState, TaskEvent, Subtask } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/utils/format"

// ──────────────────────────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────────────────────────

type TabKey = "description" | "report" | "subtasks" | "history"

function fmtMin(min: number, _locale: string): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

function fmtDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(iso))
}

function fmtTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso))
}

function fmtRelative(iso: string, locale: string): string {
  return formatRelative(new Date(iso), locale === "en" ? "en" : "ru")
}

function getDeviationClass(planned: number, actual: number) {
  const pct = ((actual - planned) / planned) * 100
  if (pct <= 0) return "text-success"
  if (pct <= 20) return "text-warning"
  return "text-destructive"
}

// Map event_type to colour dot
const EVENT_DOT: Record<string, string> = {
  START: "bg-info",
  COMPLETE: "bg-success",
  SEND_TO_REVIEW: "bg-info",
  AUTO_ACCEPT: "bg-success",
  ACCEPT: "bg-success",
  REJECT: "bg-destructive",
  PAUSE: "bg-warning",
  RESUME: "bg-info",
  TRANSFER: "bg-info",
  ARCHIVE: "bg-destructive",
  RESTORE: "bg-success",
}

// ──────────────────────────────────────────────────────────────────
// SubtaskReviewBadge
// ──────────────────────────────────────────────────────────────────
function SubtaskReviewBadge({ state }: { state: SubtaskReviewState }) {
  const styles: Record<SubtaskReviewState, string> = {
    PENDING: "bg-warning/10 text-warning border-warning/20",
    ACCEPTED: "bg-success/10 text-success border-success/20",
    REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
  }
  const labels: Record<SubtaskReviewState, string> = {
    PENDING: "На проверке",
    ACCEPTED: "Принята",
    REJECTED: "Отклонена",
  }
  return (
    <Badge className={cn("text-xs", styles[state])}>
      {labels[state]}
    </Badge>
  )
}

// ──────────────────────────────────────────────────────────────────
// useElapsed — running counter for IN_PROGRESS tasks
// ──────────────────────────────────────────────────────────────────
function useElapsed(openedAt?: string, state?: string) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (state !== "IN_PROGRESS" || !openedAt) return
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [openedAt, state])
  return elapsed
}

// ──────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────

interface TaskDetailProps {
  taskId: string
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [task, setTask] = useState<TaskDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Dialog open states
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [subtaskAddOpen, setSubtaskAddOpen] = useState(false)
  const [subtaskSuggestEdit, setSubtaskSuggestEdit] = useState<Subtask | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Pending states
  const [approvePending, setApprovePending] = useState(false)
  const [rejectPending, setRejectPending] = useState(false)

  // Active tab from URL
  const tabParam = searchParams.get("tab") as TabKey | null
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam ?? "description")

  // Sidebar collapsible state (mobile)
  const [sidebarOpen, setSidebarOpen] = useState<Record<string, boolean>>({
    status: true,
    assignee: false,
    location: false,
    timing: false,
    settings: false,
  })

  const elapsedMin = useElapsed(task?.history_brief?.opened_at, task?.state)

  // ── tab URL sync ──────────────────────────────────────────────────
  function changeTab(tab: TabKey) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", tab)
    window.history.replaceState(null, "", url.toString())
  }

  // ── load ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getTaskById(taskId)
      setTask(res.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      if (msg.includes("not found")) {
        setNotFound(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { load() }, [load])

  // ── hotkeys ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!task || task.review_state !== "ON_REVIEW") return
      if (e.key === "a" || e.key === "A") setApproveOpen(true)
      if (e.key === "r" || e.key === "R") setRejectOpen(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [task])

  // ── role helpers ──────────────────────────────────────────────────
  const isManager = ["SUPERVISOR", "REGIONAL", "NETWORK_OPS", "STORE_DIRECTOR"].includes(user.role)
  const isNetworkOps = user.role === "NETWORK_OPS"
  const isStoreDirector = user.role === "STORE_DIRECTOR"
  const canReview = isManager && task?.review_state === "ON_REVIEW"
  const canTransfer = isManager && (task?.state === "IN_PROGRESS" || task?.state === "PAUSED")
  // Server-computed flag; falls back to runtime check for non-t-1042 tasks
  const isOverdue = !!task && (
    task.is_overdue === true ||
    (task.state !== "COMPLETED" && !!task.time_end && (() => {
      const now = new Date()
      const [h, m] = task.time_end!.split(":").map(Number)
      const deadline = new Date(task.created_at)
      deadline.setHours(h, m, 0, 0)
      return now > deadline
    })())
  )

  // ── actions ───────────────────────────────────────────────────────
  async function handleApprove(comment?: string) {
    if (!task) return
    setApprovePending(true)
    try {
      const res = await approveTask(task.id, comment)
      if (!res.success) throw new Error(res.error?.message)
      toast.success(t("approve_toast"))
      await load()
    } catch {
      toast.error(tCommon("error"))
    } finally {
      setApprovePending(false)
    }
  }

  async function handleReject(reason: string) {
    if (!task) return
    setRejectPending(true)
    try {
      const res = await rejectTask(task.id, reason)
      if (!res.success) throw new Error(res.error?.message)
      toast.success(t("reject_toast"))
      await load()
    } catch {
      toast.error(tCommon("error"))
    } finally {
      setRejectPending(false)
    }
  }

  async function handleArchive(reason: ArchiveReason, comment?: string) {
    if (!task) return
    try {
      const res = await archiveTask(task.id, reason, comment)
      if (!res.success) throw new Error(res.error?.message)
      toast.success(t("archive_toast"))
      router.push(ADMIN_ROUTES.tasks)
    } catch {
      toast.error(tCommon("error"))
    }
  }

  async function handleTransfer(userId: number) {
    if (!task) return
    try {
      const res = await transferTask(task.id, userId)
      if (!res.success) throw new Error(res.error?.message)
      toast.success(t("transfer_toast"))
      await load()
    } catch {
      toast.error(tCommon("error"))
    }
  }

  async function handleTitleSave(newTitle: string) {
    if (!task) return
    try {
      await updateTask(task.id, { title: newTitle })
      setTask((prev) => prev ? { ...prev, title: newTitle } : prev)
    } catch {
      toast.error(tCommon("error"))
    }
  }

  async function handleStatusOverride(newState: TaskState, justification: string) {
    if (!task) return
    try {
      await updateTask(task.id, { state: newState })
      toast.success(t("status_override_toast"))
      await load()
    } finally {
      // no-op justification is logged server-side
      void justification
    }
  }

  async function handleSubtaskAdd(name: string, hint?: string) {
    if (!task) return
    try {
      const res = await addSubtaskToTask(task.id, name, hint)
      if (!res.success) throw new Error(res.error?.message)
      toast.success(t("subtask_toast_added"))
      await load()
    } catch {
      toast.error(tCommon("error"))
    }
  }

  async function handleSubtaskSuggestEdit(_subtask: Subtask, _newText: string) {
    // Stub: отправить предложение в /subtasks/moderation очередь.
    // На MVP — просто показываем тост; реальная мутация добавится с API.
    toast.success(t("subtask_toast_suggested_edit"))
    setSubtaskSuggestEdit(null)
  }

  async function handleSubtaskDelete(id: number) {
    try {
      await removeSubtask(String(id))
      toast.success(t("subtask_toast_deleted"))
      await load()
    } catch {
      toast.error(tCommon("error"))
    }
  }

  // ── Computed values ───────────────────────────────────────────────
  // Первая невыполненная подзадача (review_state !== ACCEPTED) — для autofill в reject-диалоге
  const firstIncompleteSubtaskName = task?.subtasks?.find(
    (s) => s.review_state !== "ACCEPTED",
  )?.name

  const actualMin = task?.history_brief
    ? task.history_brief.work_intervals.reduce((acc, iv) => {
        return acc + Math.floor((new Date(iv.to).getTime() - new Date(iv.from).getTime()) / 60000)
      }, 0)
    : null

  const overdueDiff = isOverdue && task?.time_end
    ? (() => {
        const [h, m] = task.time_end.split(":").map(Number)
        // For completed tasks anchor to completion time, not now
        const refTime = task.history_brief?.completed_at
          ? new Date(task.history_brief.completed_at)
          : new Date()
        const deadline = new Date(refTime)
        deadline.setHours(h, m, 0, 0)
        if (refTime < deadline) deadline.setDate(deadline.getDate() - 1)
        return Math.max(0, Math.floor((refTime.getTime() - deadline.getTime()) / 60000))
      })()
    : null

  // ── LOADING ─────��─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-80" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // ── NOT FOUND ─────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="size-10 text-muted-foreground" strokeWidth={1.5} />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-xl font-semibold">{t("not_found_title")}</p>
            <p className="text-sm text-muted-foreground">{t("not_found_desc", { id: taskId })}</p>
          </div>
          <Button variant="outline" onClick={() => router.push(ADMIN_ROUTES.tasks)}>
            {t("not_found_back")}
          </Button>
        </div>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <Alert variant="destructive" className="max-w-lg">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t("error_load")}</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4 mt-1">
          <span className="text-sm">{error}</span>
          <Button variant="outline" size="sm" onClick={load}>{tCommon("retry")}</Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!task) return null

  // ── BREADCRUMB ────────────────────────────────────────────────────
  const breadcrumbs = [
    { label: t("breadcrumb_home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumb_tasks"), href: ADMIN_ROUTES.tasks },
    { label: task.title },
  ]

  // ── Actions dropdown ──────────────────────────────────────────────
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
          <DropdownMenuItem onClick={() => setTransferOpen(true)}>
            <UserX className="size-4 mr-2" />
            {t("action_transfer")}
          </DropdownMenuItem>
        )}
        {isNetworkOps && (
          <DropdownMenuItem onClick={() => setOverrideOpen(true)}>
            <ShieldAlert className="size-4 mr-2" />
            {t("action_change_status")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setArchiveOpen(true)}
        >
          <ArchiveIcon className="size-4 mr-2" />
          {t("action_archive")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // ── History event label ───────────────────────────────────────────
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

  // ── Tab content ───────────────────────────────────────────────────
  // Description tab
  const tabDescription = (
    <div className="flex flex-col gap-4">
      {/* Description card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t("section_description")}</CardTitle>
        </CardHeader>
        <CardContent>
          {task.description ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{task.description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">{t("no_description")}</p>
          )}
        </CardContent>
      </Card>

      {/* Manager comment */}
      {task.comment && (
        <Card className="bg-muted/30 border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <MessageSquare className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-medium text-primary">{t("section_manager_comment")}</p>
                <p className="text-sm leading-relaxed text-foreground">{task.comment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hints */}
      {task.hints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="size-4" />
                {t("section_hints")}
              </CardTitle>
              {task.hints.length > 3 && (
                <a href={ADMIN_ROUTES.hints} className="text-xs text-primary hover:underline">
                  {t("hints_all")}
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {task.hints.slice(0, 5).map((hint) => (
                <li key={hint.id} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 mt-0.5 size-1.5 rounded-full bg-primary/50 inline-block mt-2" />
                  {hint.text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // Report tab
  const tabReport = (
    <div className="flex flex-col gap-4">
      {task.state !== "COMPLETED" ? (
        <EmptyState
          icon={FileText}
          title={t("report_empty_title")}
          description={t("report_empty_desc")}
        />
      ) : (
        <>
          {/* Photo — секция показывается только если фото требуется или уже загружено */}
          {(task.requires_photo || task.report_image_url) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("section_report_photo")}</CardTitle>
            </CardHeader>
            <CardContent>
              {task.requires_photo && !task.report_image_url ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription>{t("photo_required_missing")}</AlertDescription>
                </Alert>
              ) : task.report_image_url ? (
                <>
                  {/* Desktop: Dialog lightbox */}
                  <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                    <DialogTrigger asChild>
                      <button className="w-full rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary hidden md:block" aria-label={t("section_report_photo")}>
                        <img
                          src={task.report_image_url}
                          alt={t("section_report_photo")}
                          className="w-full aspect-video object-cover rounded-md hover:opacity-95 transition-opacity cursor-zoom-in"
                          crossOrigin="anonymous"
                        />
                      </button>
                    </DialogTrigger>
                    {lightboxOpen && (
                      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
                        <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                          <img src={task.report_image_url} alt={t("section_report_photo")} className="w-full rounded-md" crossOrigin="anonymous" />
                          <div className="absolute top-3 right-3 flex gap-2">
                            <Button size="sm" variant="secondary" asChild>
                              <a href={task.report_image_url} download target="_blank" rel="noopener noreferrer">
                                <Download className="size-4 mr-1" />{t("photo_download")}
                              </a>
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setLightboxOpen(false)}>{t("lightbox_close")}</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Dialog>

                  {/* Mobile: Sheet bottom */}
                  <Sheet>
                    <button className="w-full rounded-md overflow-hidden md:hidden" aria-label={t("section_report_photo")}>
                      <img
                        src={task.report_image_url}
                        alt={t("section_report_photo")}
                        className="w-full aspect-video object-cover rounded-md cursor-pointer"
                        crossOrigin="anonymous"
                        onClick={() => setLightboxOpen(true)}
                      />
                    </button>
                    <SheetContent side="bottom" className="h-[85vh] md:hidden">
                      <SheetHeader>
                        <SheetTitle>{t("section_report_photo")}</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col gap-4 mt-4">
                        <img src={task.report_image_url} alt={t("section_report_photo")} className="w-full rounded-md" crossOrigin="anonymous" />
                        <Button asChild variant="outline">
                          <a href={task.report_image_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="size-4 mr-2" />{t("photo_download")}
                          </a>
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              ) : null}
            </CardContent>
          </Card>
          )}

          {/* Timing stats */}
          {actualMin !== null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("section_timing")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("timing_planned")}</p>
                    <p className="text-base font-semibold text-foreground">{fmtMin(task.planned_minutes, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("timing_actual")}</p>
                    <p className={cn("text-base font-semibold", getDeviationClass(task.planned_minutes, actualMin))}>
                      {fmtMin(actualMin, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("timing_deviation")}</p>
                    <p className={cn("text-base font-semibold", getDeviationClass(task.planned_minutes, actualMin))}>
                      {actualMin <= task.planned_minutes
                        ? `-${fmtMin(task.planned_minutes - actualMin, locale)}`
                        : `+${fmtMin(actualMin - task.planned_minutes, locale)}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Marketing channel */}
          {task.marketing_channel_target && task.review_state === "ACCEPTED" && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Send className="size-4 text-info" />
                  <span>{t("marketing_sent", { channel: task.marketing_channel_target })}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inline Approve/Reject on desktop for ON_REVIEW */}
          {task.review_state === "ON_REVIEW" && canReview && (
            <div className="hidden md:flex gap-2">
              <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex-1">
                    <XCircle className="size-4 mr-1.5" />{t("btn_reject")}
                  </Button>
                </DialogTrigger>
                <RejectDialogContent onReject={handleReject} onClose={() => setRejectOpen(false)} isPending={rejectPending} incompleteSubtaskName={firstIncompleteSubtaskName} />
              </Dialog>
              <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-success text-success-foreground hover:bg-success/90 flex-1" size="sm">
                    <CheckCircle2 className="size-4 mr-1.5" />{t("btn_approve")}
                  </Button>
                </DialogTrigger>
                <ApproveDialogContent onApprove={handleApprove} onClose={() => setApproveOpen(false)} isPending={approvePending} />
              </Dialog>
            </div>
          )}
        </>
      )}
    </div>
  )

  // Subtasks tab
  const canAddSubtask = isManager && task.state !== "COMPLETED" && task.review_state !== "ACCEPTED"

  const tabSubtasks = (
    <div className="flex flex-col gap-4">
      {task.subtasks.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={t("subtasks_empty_title")}
          description={t("subtasks_empty_desc")}
          action={canAddSubtask ? { label: t("subtasks_add_cta"), onClick: () => setSubtaskAddOpen(true) } : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-10">{t("subtask_col_order")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{t("subtask_col_name")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-16">{t("subtask_col_hints")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-28">{t("subtask_col_status")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-24">{t("subtask_col_time")}</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {task.subtasks.map((subtask) => (
                  <tr key={subtask.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{subtask.order}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{subtask.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{subtask.hints_count > 0 ? subtask.hints_count : "—"}</td>
                    <td className="px-4 py-3"><SubtaskReviewBadge state={subtask.review_state} /></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {subtask.duration_min ? fmtMin(subtask.duration_min, locale) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <SubtaskActionsMenu
                        subtask={subtask}
                        isStoreDirector={isStoreDirector}
                        isNetworkOps={isNetworkOps}
                        onSuggestEdit={() => setSubtaskSuggestEdit(subtask)}
                        onDelete={() => handleSubtaskDelete(subtask.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {task.subtasks.map((subtask) => (
              <Card key={subtask.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5 w-5">{subtask.order}.</span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{subtask.name}</p>
                      <div className="flex items-center gap-2">
                        <SubtaskReviewBadge state={subtask.review_state} />
                        {subtask.duration_min && (
                          <span className="text-xs text-muted-foreground">{fmtMin(subtask.duration_min, locale)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <SubtaskActionsMenu
                    subtask={subtask}
                    isStoreDirector={isStoreDirector}
                    isNetworkOps={isNetworkOps}
                    onSuggestEdit={() => setSubtaskSuggestEdit(subtask)}
                    onDelete={() => handleSubtaskDelete(subtask.id)}
                  />
                </div>
              </Card>
            ))}
          </div>

          {canAddSubtask && (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setSubtaskAddOpen(true)}>
              <Plus className="size-4 mr-1.5" />{t("subtasks_add_cta")}
            </Button>
          )}
        </>
      )}

      {/* Subtask add dialog */}
      <Dialog open={subtaskAddOpen} onOpenChange={setSubtaskAddOpen}>
        <SubtaskAddDialogContent onAdd={handleSubtaskAdd} onClose={() => setSubtaskAddOpen(false)} />
      </Dialog>

      {/* Subtask suggest-edit dialog */}
      <Dialog open={subtaskSuggestEdit !== null} onOpenChange={(v) => { if (!v) setSubtaskSuggestEdit(null) }}>
        {subtaskSuggestEdit && (
          <SubtaskSuggestEditDialogContent
            currentText={subtaskSuggestEdit.name}
            onSubmit={(newText) => handleSubtaskSuggestEdit(subtaskSuggestEdit, newText)}
            onClose={() => setSubtaskSuggestEdit(null)}
          />
        )}
      </Dialog>
    </div>
  )

  // History tab
  const HISTORY_PAGE = 20
  const visibleHistory = task.history.slice(0, HISTORY_PAGE)
  const tabHistory = (
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

  // ── Sidebar cards (desktop sticky / mobile collapsible) ──────────
  function SidebarCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
      <>
        {/* Desktop: plain Card */}
        <Card className="hidden lg:block">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">{children}</CardContent>
        </Card>

        {/* Mobile: Collapsible */}
        <Collapsible
          open={sidebarOpen[id]}
          onOpenChange={(open) => setSidebarOpen((prev) => ({ ...prev, [id]: open }))}
          className="lg:hidden border rounded-lg overflow-hidden"
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 min-h-[44px] hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium text-foreground">{title}</span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", sidebarOpen[id] && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 pt-1">{children}</CollapsibleContent>
        </Collapsible>
      </>
    )
  }

  const sidebarStatusContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <TaskStateBadge state={task.state} />
        {task.review_state !== "NONE" && <ReviewStateBadge reviewState={task.review_state} />}
      </div>
      {task.review_state === "REJECTED" && task.review_comment && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{task.review_comment}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>{t("sidebar_created", { date: fmtDate(task.created_at, locale) })}</span>
        <span>{t("sidebar_updated", { time: fmtTime(task.updated_at, locale) })}</span>
      </div>
    </div>
  )

  const assigneeName = task.assignee_name
    ? (() => {
        const parts = task.assignee_name.split(" ")
        return { last_name: parts[0] ?? "", first_name: parts[1] ?? "", middle_name: parts[2] }
      })()
    : null

  const sidebarAssigneeContent = (
    <div className="flex flex-col gap-3">
      {task.assignee_id && assigneeName ? (
        <div className="flex items-center justify-between gap-2">
          <UserCell user={assigneeName} />
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <a href={ADMIN_ROUTES.employeeDetail(String(task.assignee_id))} aria-label="Открыть профиль">
              <User className="size-4" />
            </a>
          </Button>
        </div>
      ) : task.assigned_to_permission ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-muted-foreground" />
          {t("sidebar_any_permission", { permission: task.assigned_to_permission })}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="size-4" />
            {t("sidebar_not_assigned")}
          </div>
          {isManager && (
            <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
              {t("sidebar_assign_btn")}
            </Button>
          )}
        </div>
      )}
      {task.state === "IN_PROGRESS" && elapsedMin > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("sidebar_elapsed", { time: fmtMin(elapsedMin, locale) })}
        </p>
      )}
    </div>
  )

  const sidebarLocationContent = (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2 text-foreground">
        <Store className="size-4 text-muted-foreground shrink-0" />
        <a href={ADMIN_ROUTES.storeDetail(String(task.store_id))} className="hover:underline text-foreground">
          {task.store_name}
        </a>
      </div>
      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="size-4 text-muted-foreground shrink-0" />
        <a href={ADMIN_ROUTES.taxonomyZones} className="hover:underline text-foreground">
          {task.zone_name}
        </a>
      </div>
    </div>
  )

  const sidebarTimingContent = (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("sidebar_timing_planned")}</span>
        <span className="font-medium text-foreground">{fmtMin(task.planned_minutes, locale)}</span>
      </div>
      {actualMin !== null && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sidebar_timing_actual")}</span>
          <span className={cn("font-medium", getDeviationClass(task.planned_minutes, actualMin))}>{fmtMin(actualMin, locale)}</span>
        </div>
      )}
      {task.time_start && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sidebar_timing_scheduled")}</span>
          <span className="font-medium text-foreground">{task.time_start.slice(0, 5)}</span>
        </div>
      )}
      {task.time_end && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sidebar_timing_deadline")}</span>
          <span className="font-medium text-foreground">{task.time_end.slice(0, 5)}</span>
        </div>
      )}
      {isOverdue && overdueDiff !== null && (
        <p className="text-xs font-medium text-destructive mt-1">
          {t("sidebar_timing_overdue", { duration: fmtMin(overdueDiff, locale) })}
        </p>
      )}
    </div>
  )

  const sidebarSettingsContent = (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("sidebar_task_type")}</span>
        <Badge variant="outline" className="text-xs">{task.type}</Badge>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("sidebar_policy")}</span>
        <span className="font-medium text-foreground">
          {task.acceptance_policy === "AUTO" ? t("sidebar_policy_auto") : t("sidebar_policy_manual")}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">{t("sidebar_photo")}</span>
        <span className={cn("font-medium", task.requires_photo ? "text-foreground" : "text-muted-foreground")}>
          {task.requires_photo ? t("sidebar_photo_required") : t("sidebar_photo_not_required")}
        </span>
      </div>
      {task.state === "NEW" && (
        <a href={ADMIN_ROUTES.taskEdit(task.id)} className="text-xs text-primary hover:underline mt-1">
          {t("sidebar_edit_link")}
        </a>
      )}
    </div>
  )

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* PAGE HEADER ─────────────────────────────────────────────────── */}
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
              <TitleInlineEditButton title={task.title} onSave={handleTitleSave} />
            </div>
            {/* Mobile: TouchInlineEdit */}
            <div className="md:hidden">
              <TouchInlineEdit
                value={task.title}
                onSave={handleTitleSave}
                className="text-xl font-semibold"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="size-9" onClick={load} aria-label={t("action_refresh")}>
              <RefreshCw className="size-4" />
            </Button>
            {actionsMenu}
          </div>
        </div>
      </div>

      {/* MAIN GRID ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Sidebar cards on mobile (collapsible accordion), then main tabs */}
        <div className="lg:hidden flex flex-col gap-2">
          <SidebarCard id="status" title={t("sidebar_status")}>{sidebarStatusContent}</SidebarCard>
          <SidebarCard id="assignee" title={t("sidebar_assignee")}>{sidebarAssigneeContent}</SidebarCard>
          <SidebarCard id="location" title={t("sidebar_location")}>{sidebarLocationContent}</SidebarCard>
          <SidebarCard id="timing" title={t("sidebar_timing")}>{sidebarTimingContent}</SidebarCard>
          <SidebarCard id="settings" title={t("sidebar_settings")}>{sidebarSettingsContent}</SidebarCard>
        </div>

        {/* MAIN CONTENT: Tabs */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={(v) => changeTab(v as TabKey)}>
            {/* Tab list — horizontal scroll on mobile */}
            <ScrollArea>
              <TabsList className="w-full justify-start mb-4 h-auto flex-wrap gap-0">
                <TabsTrigger value="description" className="min-h-[36px]">{t("tab_description")}</TabsTrigger>
                <TabsTrigger value="report" className="min-h-[36px]">{t("tab_report")}</TabsTrigger>
                <TabsTrigger value="subtasks" className="min-h-[36px]">
                  {t("tab_subtasks")}
                  {task.subtasks.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                      {task.subtasks.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="min-h-[36px]">
                  {t("tab_history")}
                  {task.history.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                      {task.history.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="description" className="mt-0">{tabDescription}</TabsContent>
            <TabsContent value="report" className="mt-0">{tabReport}</TabsContent>
            <TabsContent value="subtasks" className="mt-0">{tabSubtasks}</TabsContent>
            <TabsContent value="history" className="mt-0">{tabHistory}</TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: Sidebar (desktop only — sticky) */}
        <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_status")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">{sidebarStatusContent}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_assignee")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">{sidebarAssigneeContent}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_location")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">{sidebarLocationContent}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_timing")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">{sidebarTimingContent}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_settings")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">{sidebarSettingsContent}</CardContent>
          </Card>
        </div>
      </div>

      {/* STICKY BOTTOM BAR ───────────────────────────────────────────── */}
      {canReview && (
        <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background border-t flex justify-end gap-2 z-10">
          {/* Reject */}
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex-1 md:flex-none"
                aria-label={`${t("btn_reject")} (R)`}
              >
                <XCircle className="size-4 mr-1.5 md:mr-2" />
                <span>{t("btn_reject")}</span>
                <span className="hidden md:inline ml-1.5 text-xs opacity-60">R</span>
              </Button>
            </DialogTrigger>
            <RejectDialogContent onReject={handleReject} onClose={() => setRejectOpen(false)} isPending={rejectPending} incompleteSubtaskName={firstIncompleteSubtaskName} />
          </Dialog>

          {/* Approve */}
          <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-success text-success-foreground hover:bg-success/90 flex-1 md:flex-none"
                aria-label={`${t("btn_approve")} (A)`}
              >
                <CheckCircle2 className="size-4 mr-1.5 md:mr-2" />
                <span>{t("btn_approve")}</span>
                <span className="hidden md:inline ml-1.5 text-xs opacity-60">A</span>
              </Button>
            </DialogTrigger>
            <ApproveDialogContent onApprove={handleApprove} onClose={() => setApproveOpen(false)} isPending={approvePending} />
          </Dialog>
        </div>
      )}

      {/* GLOBAL DIALOGS ──────────────────────────────────────────────── */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <ArchiveDialogContent onArchive={handleArchive} onClose={() => setArchiveOpen(false)} />
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <TransferDialogContent
          currentAssigneeId={task.assignee_id}
          onTransfer={handleTransfer}
          onClose={() => setTransferOpen(false)}
        />
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <AssignDialogContent
          onAssign={(userId) => handleTransfer(userId)}
          onClose={() => setAssignOpen(false)}
        />
      </Dialog>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <StatusOverrideDialogContent
          currentState={task.state}
          onOverride={handleStatusOverride}
          onClose={() => setOverrideOpen(false)}
        />
      </Dialog>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Desktop inline title edit (hover pencil pattern)
// ──────────────────────────────────────────────────────────────────
function TitleInlineEditButton({ title, onSave }: { title: string; onSave: (v: string) => void }) {
  const tCommon = useTranslations("common")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(title)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [editing, title])

  function save() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) onSave(trimmed)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
    setDraft(title)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 -ml-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel() }}
          onBlur={cancel}
          className="text-2xl font-semibold bg-transparent border-b-2 border-primary outline-none px-1 min-w-64 text-foreground"
          aria-label={tCommon("edit")}
        />
        <Button type="button" variant="ghost" size="icon" className="size-7 text-success" onMouseDown={(e) => { e.preventDefault(); save() }}>
          <CheckCircle2 className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground" onMouseDown={(e) => { e.preventDefault(); cancel() }}>
          <XCircle className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      onClick={() => setEditing(true)}
      aria-label={tCommon("edit")}
    >
      <Pencil className="size-3.5" />
    </Button>
  )
}

// ──────────────────────────────────────────────────────────────────
// SubtaskActionsMenu
// ──────────────────────────────────────────────────────────────────
interface SubtaskActionsMenuProps {
  subtask: Subtask
  isStoreDirector: boolean
  isNetworkOps: boolean
  onSuggestEdit: () => void
  onDelete: () => void
}

function SubtaskActionsMenu({ subtask, isStoreDirector, isNetworkOps, onSuggestEdit, onDelete }: SubtaskActionsMenuProps) {
  const t = useTranslations("screen.taskDetail")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 min-h-[44px] md:min-h-0">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isStoreDirector ? (
          <DropdownMenuItem onClick={onSuggestEdit}>
            <Pencil className="size-4 mr-2 text-info" />
            {t("subtask_action_suggest_edit")}
          </DropdownMenuItem>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                  <Pencil className="size-4 mr-2 text-info" />
                  {t("subtask_action_suggest_edit")}
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("subtask_action_suggest_edit_disabled_hint")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {(subtask.review_state === "PENDING" || subtask.review_state === "REJECTED" || isNetworkOps) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-4 mr-2" />
              {t("subtask_action_delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
