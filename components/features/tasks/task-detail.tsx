"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ApproveDialogContent } from "./approve-dialog-content"
import { RejectDialogContent } from "./reject-dialog-content"
import { ArchiveDialogContent } from "./archive-dialog-content"
import { TransferDialogContent } from "./transfer-dialog-content"
import { StatusOverrideDialogContent } from "./status-override-dialog-content"
import { AssignDialogContent } from "./assign-dialog-content"

import {
  getTaskById,
  approveTask,
  rejectTask,
  archiveTask,
  transferTask,
  updateTask,
  addOperationToTask,
  removeOperation,
} from "@/lib/api/tasks"
import type { TaskDetail as TaskDetailType } from "@/lib/api/tasks"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"
import type { ArchiveReason, TaskState, Operation } from "@/lib/types"

import { TabKey, useElapsed } from "./task-detail/_shared"
import { TaskDetailHeader } from "./task-detail/header"
import {
  SidebarAssigneeContent,
  SidebarCard,
  SidebarLocationContent,
  SidebarSettingsContent,
  SidebarStatusContent,
  SidebarTimingContent,
} from "./task-detail/sidebar"
import { TabDescription } from "./task-detail/tab-description"
import { TabHistory } from "./task-detail/tab-history"
import { TabReport } from "./task-detail/tab-report"
import { TabSubtasks } from "./task-detail/tab-subtasks"

// ──────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────

interface TaskDetailProps {
  taskId: string
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const t = useTranslations("screen.taskDetail")
  const tCommon = useTranslations("common")
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
  const [subtaskSuggestEdit, setSubtaskSuggestEdit] = useState<Operation | null>(null)
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
      const res = await addOperationToTask(task.id, name, hint)
      if (!res.success) throw new Error(res.error?.message)
      toast.success(t("subtask_toast_added"))
      await load()
    } catch {
      toast.error(tCommon("error"))
    }
  }

  async function handleSubtaskSuggestEdit(_subtask: Operation, _newText: string) {
    // Stub: отправить предложение в /subtasks/moderation очередь.
    // На MVP — просто показываем тост; реальная мутация добавится с API.
    toast.success(t("subtask_toast_suggested_edit"))
    setSubtaskSuggestEdit(null)
  }

  async function handleSubtaskDelete(id: number) {
    try {
      await removeOperation(String(id))
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

  // ── LOADING ───────────────────────────────────────────────────────
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

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* PAGE HEADER */}
      <TaskDetailHeader
        task={task}
        isOverdue={isOverdue}
        isManager={isManager}
        isStoreDirector={isStoreDirector}
        isNetworkOps={isNetworkOps}
        canTransfer={canTransfer}
        onRefresh={load}
        onTitleSave={handleTitleSave}
        onTransferOpen={() => setTransferOpen(true)}
        onArchiveOpen={() => setArchiveOpen(true)}
        onOverrideOpen={() => setOverrideOpen(true)}
      />

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Sidebar cards on mobile (collapsible accordion), then main tabs */}
        <div className="lg:hidden flex flex-col gap-2">
          <SidebarCard
            id="status"
            title={t("sidebar_status")}
            isOpen={sidebarOpen.status}
            onOpenChange={(open) => setSidebarOpen((prev) => ({ ...prev, status: open }))}
          >
            <SidebarStatusContent task={task} />
          </SidebarCard>
          <SidebarCard
            id="assignee"
            title={t("sidebar_assignee")}
            isOpen={sidebarOpen.assignee}
            onOpenChange={(open) => setSidebarOpen((prev) => ({ ...prev, assignee: open }))}
          >
            <SidebarAssigneeContent
              task={task}
              isManager={isManager}
              elapsedMin={elapsedMin}
              onAssignClick={() => setAssignOpen(true)}
            />
          </SidebarCard>
          <SidebarCard
            id="location"
            title={t("sidebar_location")}
            isOpen={sidebarOpen.location}
            onOpenChange={(open) => setSidebarOpen((prev) => ({ ...prev, location: open }))}
          >
            <SidebarLocationContent task={task} />
          </SidebarCard>
          <SidebarCard
            id="timing"
            title={t("sidebar_timing")}
            isOpen={sidebarOpen.timing}
            onOpenChange={(open) => setSidebarOpen((prev) => ({ ...prev, timing: open }))}
          >
            <SidebarTimingContent
              task={task}
              actualMin={actualMin}
              isOverdue={isOverdue}
              overdueDiff={overdueDiff}
            />
          </SidebarCard>
          <SidebarCard
            id="settings"
            title={t("sidebar_settings")}
            isOpen={sidebarOpen.settings}
            onOpenChange={(open) => setSidebarOpen((prev) => ({ ...prev, settings: open }))}
          >
            <SidebarSettingsContent task={task} />
          </SidebarCard>
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

            <TabsContent value="description" className="mt-0">
              <TabDescription task={task} />
            </TabsContent>
            <TabsContent value="report" className="mt-0">
              <TabReport
                task={task}
                actualMin={actualMin}
                canReview={canReview}
                lightboxOpen={lightboxOpen}
                setLightboxOpen={setLightboxOpen}
                approveOpen={approveOpen}
                setApproveOpen={setApproveOpen}
                rejectOpen={rejectOpen}
                setRejectOpen={setRejectOpen}
                approvePending={approvePending}
                rejectPending={rejectPending}
                onApprove={handleApprove}
                onReject={handleReject}
                firstIncompleteSubtaskName={firstIncompleteSubtaskName}
              />
            </TabsContent>
            <TabsContent value="subtasks" className="mt-0">
              <TabSubtasks
                task={task}
                isManager={isManager}
                isStoreDirector={isStoreDirector}
                isNetworkOps={isNetworkOps}
                subtaskAddOpen={subtaskAddOpen}
                setSubtaskAddOpen={setSubtaskAddOpen}
                subtaskSuggestEdit={subtaskSuggestEdit}
                setSubtaskSuggestEdit={setSubtaskSuggestEdit}
                onSubtaskAdd={handleSubtaskAdd}
                onSubtaskSuggestEdit={handleSubtaskSuggestEdit}
                onSubtaskDelete={handleSubtaskDelete}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-0">
              <TabHistory task={task} />
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: Sidebar (desktop only — sticky) */}
        <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_status")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <SidebarStatusContent task={task} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_assignee")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <SidebarAssigneeContent
                task={task}
                isManager={isManager}
                elapsedMin={elapsedMin}
                onAssignClick={() => setAssignOpen(true)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_location")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <SidebarLocationContent task={task} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_timing")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <SidebarTimingContent
                task={task}
                actualMin={actualMin}
                isOverdue={isOverdue}
                overdueDiff={overdueDiff}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("sidebar_settings")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <SidebarSettingsContent task={task} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
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
            <RejectDialogContent
              onReject={handleReject}
              onClose={() => setRejectOpen(false)}
              isPending={rejectPending}
              incompleteSubtaskName={firstIncompleteSubtaskName}
            />
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
            <ApproveDialogContent
              onApprove={handleApprove}
              onClose={() => setApproveOpen(false)}
              isPending={approvePending}
            />
          </Dialog>
        </div>
      )}

      {/* GLOBAL DIALOGS */}
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
