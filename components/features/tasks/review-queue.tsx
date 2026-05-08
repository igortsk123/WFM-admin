"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { useQueryState } from "nuqs"
import { toast } from "sonner"
import {
  RefreshCw,
  Keyboard,
  Inbox,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"

import type { TaskWithAvatar } from "@/lib/api/tasks"
import {
  getTasks,
  approveTask,
  rejectTask,
  getTaskListFilterOptions,
  type TaskFiltersResponse,
} from "@/lib/api/tasks"
import { getStores } from "@/lib/api/stores"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"

import { calcActualMin, PAGE_SIZE, type SortOption } from "./review-queue/_shared"
import { FiltersBar } from "./review-queue/filters-bar"
import { QueueList } from "./review-queue/queue-list"
import { PreviewPane } from "./review-queue/preview-pane"
import { ReviewSheet } from "./review-queue/review-sheet"
import { HotkeysDialog } from "./review-queue/hotkeys-dialog"

// ─────────────────────────────────────────────────────────────────────────────
// ReviewQueue — orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export function ReviewQueue() {
  const t = useTranslations("screen.reviewQueue")
  const locale = useLocale()
  const { user } = useAuth()
  const isNetworkOps = user.role === "NETWORK_OPS"

  // ── URL state ──────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useQueryState("selected")

  // ── Filters & sort ─────────────────────────────────────────────────────────
  const [storeFilter, setStoreFilter] = React.useState("")
  const [zoneFilter, setZoneFilter] = React.useState("")
  const [workTypeFilter, setWorkTypeFilter] = React.useState("")
  const [assigneeFilter, setAssigneeFilter] = React.useState("")
  const [sortBy, setSortBy] = React.useState<SortOption>("newest")

  // ── Data ───────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = React.useState<TaskWithAvatar[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)
  const [filterOptions, setFilterOptions] = React.useState<TaskFiltersResponse | null>(null)
  const [storeOptions, setStoreOptions] = React.useState<{ value: string; label: string }[]>([])

  // ── Selection & actions ────────────────────────────────────────────────────
  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null
  const [comment, setComment] = React.useState("")
  const [commentError, setCommentError] = React.useState(false)
  const [isApproving, setIsApproving] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [hotkeysOpen, setHotkeysOpen] = React.useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false)
  const [isMd, setIsMd] = React.useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const commentRef = React.useRef<HTMLTextAreaElement>(null)

  // ── Responsive ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsMd(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // ── Load filter options ────────────────────────────────────────────────────
  React.useEffect(() => {
    getTaskListFilterOptions().then(setFilterOptions)
    getStores({ active: true, page: 1, page_size: 100 }).then((res) =>
      setStoreOptions(res.data.map((s) => ({ value: String(s.id), label: s.name })))
    )
  }, [])

  // ── Load tasks ─────────────────────────────────────────────────────────────
  const loadTasks = React.useCallback(async (resetPage = true) => {
    setIsLoading(true)
    setIsError(false)
    const p = resetPage ? 1 : page
    if (resetPage) setPage(1)

    try {
      const res = await getTasks({
        review_state: "ON_REVIEW",
        archived: false,
        store_ids: storeFilter ? [Number(storeFilter)] : undefined,
        zone_ids: zoneFilter ? [Number(zoneFilter)] : undefined,
        work_type_ids: workTypeFilter ? [Number(workTypeFilter)] : undefined,
        assignee_ids: assigneeFilter ? [Number(assigneeFilter)] : undefined,
        page: p,
        page_size: PAGE_SIZE,
        sort_by: "updated_at",
        sort_dir: sortBy === "newest" ? "desc" : "asc",
      })

      let sorted = res.data
      if (sortBy === "duration") {
        sorted = [...res.data].sort((a, b) => {
          const aMin = calcActualMin(a) ?? a.planned_minutes
          const bMin = calcActualMin(b) ?? b.planned_minutes
          return bMin - aMin
        })
      }

      if (resetPage) {
        setTasks(sorted)
      } else {
        setTasks((prev) => [...prev, ...sorted])
      }
      setTotal(res.total)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [storeFilter, zoneFilter, workTypeFilter, assigneeFilter, sortBy, page])

  React.useEffect(() => { loadTasks(true) }, [storeFilter, zoneFilter, workTypeFilter, assigneeFilter, sortBy])

  // Auto-select first task if URL has ?selected=
  React.useEffect(() => {
    if (selectedId && !selectedTask && tasks.length > 0) {
      // selectedId not found in tasks — clear it
      setSelectedId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks])

  // ── Select task ────────────────────────────────────────────────────────────
  function selectTask(task: TaskWithAvatar) {
    setSelectedId(task.id)
    setComment("")
    setCommentError(false)
    if (!isMd) setMobileSheetOpen(true)
  }

  // ── Remove from queue (optimistic) ────────────────────────────────────────
  function removeFromQueue(id: string) {
    const idx = tasks.findIndex((task) => task.id === id)
    const next = tasks[idx + 1] ?? tasks[idx - 1] ?? null
    setTasks((prev) => prev.filter((task) => task.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
    if (next) {
      setSelectedId(next.id)
    } else {
      setSelectedId(null)
    }
    setComment("")
    setCommentError(false)
  }

  // ── Approve ────────────────────────────────────────────────────────────────
  async function handleApprove() {
    if (!selectedTask) return
    setIsApproving(true)
    const taskId = selectedTask.id

    // Optimistic
    removeFromQueue(taskId)
    setMobileSheetOpen(false)

    try {
      const res = await approveTask(taskId, comment || undefined)
      if (!res.success && res.error?.code === "NOT_ON_REVIEW") {
        toast.error(t("toast_conflict"))
        return
      }
      toast.success(t("toast_approved"), {
        action: {
          label: t("toast_undo"),
          onClick: () => {
            // Re-fetch to restore
            loadTasks(true)
          },
        },
        duration: 5000,
      })
    } catch {
      toast.error(t("toast_conflict"))
    } finally {
      setIsApproving(false)
    }
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  async function handleReject() {
    if (!selectedTask) return
    if (comment.trim().length < 10) {
      setCommentError(true)
      commentRef.current?.focus()
      return
    }
    setIsRejecting(true)
    const taskId = selectedTask.id

    // Optimistic
    removeFromQueue(taskId)
    setMobileSheetOpen(false)

    try {
      const res = await rejectTask(taskId, comment)
      if (!res.success && res.error?.code === "NOT_ON_REVIEW") {
        toast.error(t("toast_conflict"))
        return
      }
      toast.success(t("toast_rejected"), {
        action: {
          label: t("toast_undo"),
          onClick: () => { loadTasks(true) },
        },
        duration: 5000,
      })
    } catch {
      toast.error(t("toast_conflict"))
    } finally {
      setIsRejecting(false)
    }
  }

  function openFull() {
    if (!selectedTask) return
    window.open(`/${locale}${ADMIN_ROUTES.taskDetail(selectedTask.id)}`, "_blank")
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (e.key === "?" && !inInput) {
        setHotkeysOpen(true)
        return
      }

      if (inInput) return

      const idx = tasks.findIndex((task) => task.id === selectedId)

      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault()
        const next = tasks[idx + 1] ?? tasks[0]
        if (next) selectTask(next)
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault()
        const prev = tasks[idx - 1] ?? tasks[tasks.length - 1]
        if (prev) selectTask(prev)
      } else if (e.key === "a" || e.key === "A") {
        if (selectedTask) handleApprove()
      } else if (e.key === "r" || e.key === "R") {
        if (selectedTask) {
          if (comment.length < 10) {
            setCommentError(true)
            commentRef.current?.focus()
          } else {
            handleReject()
          }
        }
      } else if (e.key === "Enter") {
        if (selectedTask) {
          window.open(`/${locale}${ADMIN_ROUTES.taskDetail(selectedTask.id)}`, "_blank")
        }
      } else if (e.key === "Escape") {
        setSelectedId(null)
        setMobileSheetOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, selectedId, selectedTask, comment, locale])

  // ── Filter option arrays ───────────────────────────────────────────────────
  const zoneOptions = (filterOptions?.zones ?? []).map((z) => ({ value: String(z.id), label: z.name }))
  const workTypeOptions = (filterOptions?.work_types ?? []).map((w) => ({ value: String(w.id), label: w.name }))
  const assigneeOptions = (filterOptions?.assignees ?? []).map((u) => ({
    value: String(u.id),
    label: `${u.last_name} ${u.first_name}`,
  }))

  async function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    await loadTasks(false)
  }

  function handleCommentChange(v: string) {
    setComment(v)
    if (v.length >= 10) setCommentError(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <PageHeader
        title={t("title")}
        subtitle={isLoading ? undefined : t("counter", { count: total })}
        actions={
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => loadTasks(true)}
                    aria-label={t("refresh")}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("refresh")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Keyboard hint — hidden on mobile */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex"
                    onClick={() => setHotkeysOpen(true)}
                    aria-label={t("keyboard_hint")}
                  >
                    <Keyboard className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>A=принять, R=отклонить, ↑↓=навигация, Enter=полностью</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

      {/* Toolbar */}
      <FiltersBar
        isNetworkOps={isNetworkOps}
        storeOptions={storeOptions}
        zoneOptions={zoneOptions}
        workTypeOptions={workTypeOptions}
        assigneeOptions={assigneeOptions}
        storeFilter={storeFilter}
        zoneFilter={zoneFilter}
        workTypeFilter={workTypeFilter}
        assigneeFilter={assigneeFilter}
        sortBy={sortBy}
        onStoreFilterChange={setStoreFilter}
        onZoneFilterChange={setZoneFilter}
        onWorkTypeFilterChange={setWorkTypeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        onSortByChange={setSortBy}
        t={t}
      />

      {/* Error */}
      {isError && !isLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{t("error_desc")}</span>
            <Button variant="outline" size="sm" onClick={() => loadTasks(true)}>Повторить</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty queue */}
      {!isLoading && !isError && tasks.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title={t("empty_queue_title")}
          description={t("empty_queue_desc")}
          className="min-h-[50vh]"
        />
      )}

      {/* Two-column layout */}
      {(isLoading || tasks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: queue list */}
          <div className="lg:col-span-1">
            <QueueList
              tasks={tasks}
              total={total}
              isLoading={isLoading}
              selectedId={selectedId}
              onSelect={selectTask}
              onLoadMore={handleLoadMore}
              t={t}
              locale={locale}
            />
          </div>

          {/* Right: preview pane — desktop only */}
          <div className="hidden lg:block lg:col-span-2 sticky top-8">
            {selectedTask ? (
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="pr-2">
                  <PreviewPane
                    task={selectedTask}
                    comment={comment}
                    onCommentChange={handleCommentChange}
                    commentError={commentError}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isApproving={isApproving}
                    isRejecting={isRejecting}
                    onOpenFull={openFull}
                    t={t}
                    locale={locale}
                  />
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[calc(100vh-180px)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="flex size-20 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-10 text-muted-foreground" strokeWidth={1.5} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold">{t("empty_preview_title")}</p>
                    <p className="text-sm text-muted-foreground">{t("empty_preview_desc")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile sheet */}
      <ReviewSheet
        task={selectedTask}
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        comment={comment}
        onCommentChange={handleCommentChange}
        commentError={commentError}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={isApproving}
        isRejecting={isRejecting}
        onOpenFull={openFull}
        t={t}
        locale={locale}
      />

      {/* Hotkeys dialog */}
      <HotkeysDialog open={hotkeysOpen} onClose={() => setHotkeysOpen(false)} t={t} />
    </div>
  )
}
