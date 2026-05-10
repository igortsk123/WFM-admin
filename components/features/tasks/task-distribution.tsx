"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import { format, addDays } from "date-fns"
import {
  Check,
  ChevronsUpDown,
  Wand2,
  Sparkles,
  ListChecks,
  UsersRound,
} from "lucide-react"

import type { FunctionalRole, Store } from "@/lib/types"
import type { UnassignedTask, EmployeeUtilization, TaskDistributionAllocation } from "@/lib/api/distribution"
import {
  getStoreUnassignedTasks,
  getStoreEmployeesUtilization,
  assignTaskToUser,
  autoDistribute,
  notifyOverShiftAssignment,
  getActiveLamaStoreIds,
  type OverShiftEntry,
} from "@/lib/api/distribution"
import {
  autoDistribute as autoDistributeFromHistory,
  hasPlanningPool,
  type DistributionResult as HistoryDistributionResult,
} from "@/lib/utils/auto-distribute"
import { getStores } from "@/lib/api/stores"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { useAuth } from "@/lib/contexts/auth-context"
import { useStoreContext } from "@/lib/hooks/use-store-context"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { PageHeader } from "@/components/shared/page-header"

import { TasksPanel } from "./distribution/tasks-panel"
import { EmployeesPanel } from "./distribution/employees-panel"
import { DistributionSheet } from "./distribution/distribution-sheet"
import { EmployeeSheet } from "./distribution/employee-sheet"
import { AutoDistributeHistorySheet } from "./distribution/auto-distribute-history-sheet"
import { MobileUtilizationCollapsible } from "./distribution/mobile-utilization-collapsible"
import { StickyPlanBar } from "./distribution/sticky-plan-bar"
import { getFullName } from "./distribution/_utils"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PeriodTab = "today" | "tomorrow"
type ViewMode = "by-task" | "by-employee"

// ─────────────────────────────────────────────────────────────────────────────
// StoreCombobox
// ─────────────────────────────────────────────────────────────────────────────

interface StoreComboboxProps {
  stores: Store[]
  value: number | null
  onChange: (id: number) => void
  placeholder: string
  className?: string
}

function StoreCombobox({ stores, value, onChange, placeholder, className }: StoreComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = stores.find((s) => s.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("h-9 justify-between font-normal truncate", className)}
        >
          <span className="truncate text-left text-sm">
            {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." className="h-8 text-sm" />
          <CommandList className="max-h-52">
            <CommandEmpty>Не найдено</CommandEmpty>
            <CommandGroup>
              {stores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={store.name}
                  onSelect={() => {
                    onChange(store.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-3.5",
                      value === store.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-sm truncate">{store.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskDistribution (Main Component)
// ─────────────────────────────────────────────────────────────────────────────

export function TaskDistribution() {
  const t = useTranslations("screen.taskDistribution")
  const locale = useLocale()
  const { user } = useAuth()

  // Store-context (URL ?store=N, persists across screens)
  const { storeId: ctxStoreId, setStoreId: setCtxStoreId } = useStoreContext()

  // State
  const [stores, setStores] = React.useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreIdLocal] = React.useState<number | null>(null)
  // Wrap setter — sync local + URL context
  const setSelectedStoreId = React.useCallback((id: number | null) => {
    setSelectedStoreIdLocal(id)
    void setCtxStoreId(id === null ? "all" : String(id))
  }, [setCtxStoreId])
  const [period, setPeriod] = React.useState<PeriodTab>("today")
  const [tasks, setTasks] = React.useState<UnassignedTask[]>([])
  const [employees, setEmployees] = React.useState<EmployeeUtilization[]>([])
  const [isLoadingStores, setIsLoadingStores] = React.useState(true)
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = React.useState(false)

  // Task sheet state (per-task editor)
  const [selectedTask, setSelectedTask] = React.useState<UnassignedTask | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  // Employee sheet state (per-employee editor — взгляд от сотрудника)
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeUtilization | null>(null)
  const [employeeSheetOpen, setEmployeeSheetOpen] = React.useState(false)
  const [isAutoRunning, setIsAutoRunning] = React.useState(false)
  const [isConfirming, setIsConfirming] = React.useState(false)
  // Какой ракурс показываем: список задач (по дефолту) или список сотрудников
  const [viewMode, setViewMode] = React.useState<ViewMode>("by-task")

  // History-driven auto-distribute (lib/utils/auto-distribute) — отдельный
  // алгоритм поверх LAMA snapshot'ов с детальным reasoning'ом для демо.
  const [historyResult, setHistoryResult] = React.useState<HistoryDistributionResult | null>(null)
  const [historySheetOpen, setHistorySheetOpen] = React.useState(false)
  const [isHistoryRunning, setIsHistoryRunning] = React.useState(false)
  const [isHistoryApplying, setIsHistoryApplying] = React.useState(false)

  // Локальный план — staged allocations не закоммичены на сервер.
  // Map<taskId, allocations[]>. Подтверждается через StickyPlanBar.
  const [plan, setPlan] = React.useState<Map<string, TaskDistributionAllocation[]>>(new Map())

  // Plan minutes по сотрудникам — для бейджа в EmployeeUtilizationRow
  const planMinByUser = React.useMemo(() => {
    const m = new Map<number, number>()
    for (const allocs of plan.values()) {
      for (const a of allocs) {
        m.set(a.userId, (m.get(a.userId) ?? 0) + a.minutes)
      }
    }
    return m
  }, [plan])

  // Распределять может директор магазина и выше по иерархии
  const DISTRIBUTOR_ROLES: FunctionalRole[] = [
    "STORE_DIRECTOR",
    "SUPERVISOR",
    "REGIONAL",
    "NETWORK_OPS",
    "PLATFORM_ADMIN",
  ]
  const canEdit = !!user?.role && DISTRIBUTOR_ROLES.includes(user.role)

  // Get current date based on period
  const currentDate = React.useMemo(() => {
    const today = new Date("2026-05-01") // Mock date
    return period === "tomorrow" ? format(addDays(today, 1), "yyyy-MM-dd") : format(today, "yyyy-MM-dd")
  }, [period])

  // Load stores on mount
  React.useEffect(() => {
    async function loadStores() {
      setIsLoadingStores(true)
      try {
        const response = await getStores({})
        // Фильтр /tasks/distribute: показываем только магазины у которых есть
        // реальные LAMA-блоки (получены через snapshot fetch). Магазины без
        // данных скрываем — они всё равно покажут только generated fallback,
        // что менее интересно для оператора.
        const activeIds = getActiveLamaStoreIds()
        const lamaStores = response.data.filter((s) => activeIds.has(s.id))
        setStores(lamaStores)
        if (lamaStores.length > 0) {
          const fromUrl = ctxStoreId !== null
            ? lamaStores.find((s) => s.id === ctxStoreId) ?? null
            : null
          const defaultStore = fromUrl ?? lamaStores[0]
          setSelectedStoreIdLocal(defaultStore.id)
          if (!fromUrl) void setCtxStoreId(String(defaultStore.id))
        }
      } catch (error) {
        console.error("Failed to load stores:", error)
      } finally {
        setIsLoadingStores(false)
      }
    }
    loadStores()
  }, [])

  // Load tasks and employees when store or date changes
  React.useEffect(() => {
    if (!selectedStoreId) return

    async function loadData() {
      // selectedStoreId guarded by `if (!selectedStoreId) return` выше
      if (selectedStoreId === null) return
      setIsLoadingTasks(true)
      setIsLoadingEmployees(true)

      try {
        const [tasksRes, employeesRes] = await Promise.all([
          getStoreUnassignedTasks(selectedStoreId, currentDate),
          getStoreEmployeesUtilization(selectedStoreId, currentDate),
        ])

        setTasks(tasksRes.data)
        setEmployees(employeesRes.data)
      } catch (error) {
        console.error("Failed to load data:", error)
        toast.error(t("toast.distributed_error"))
      } finally {
        setIsLoadingTasks(false)
        setIsLoadingEmployees(false)
      }
    }

    loadData()
  }, [selectedStoreId, currentDate, t])

  // Handle distribute button click — закрываем employee sheet если открыт
  const handleDistribute = (task: UnassignedTask) => {
    setEmployeeSheetOpen(false)
    setSelectedTask(task)
    setSheetOpen(true)
  }

  // Handle employee row click — закрываем task sheet если открыт
  const handleSelectEmployee = (emp: EmployeeUtilization) => {
    setSheetOpen(false)
    setSelectedEmployee(emp)
    setEmployeeSheetOpen(true)
  }

  // shop_code (external_code) текущего магазина — нужен для history-algo,
  // т.к. LAMA mocks ключуются по внешнему коду магазина (e.g. "0006"),
  // а не по числовому id.
  const selectedShopCode = React.useMemo(
    () => stores.find((s) => s.id === selectedStoreId)?.external_code ?? null,
    [stores, selectedStoreId],
  )
  const canRunHistoryAlgo = canEdit && hasPlanningPool(selectedShopCode)

  // History-driven auto-distribute — pure алгоритм по LAMA stats.
  // Открывает Sheet с reasoning'ом каждого назначения; apply = демо
  // (LAMA-задачи живут отдельно от MOCK_TASKS, мы лишь показываем план).
  const handleAutoDistributeHistory = () => {
    if (!selectedShopCode || !canRunHistoryAlgo) return
    setIsHistoryRunning(true)
    setTimeout(() => {
      const result = autoDistributeFromHistory(selectedShopCode)
      setHistoryResult(result)
      setHistorySheetOpen(true)
      setIsHistoryRunning(false)
    }, 200)
  }

  const handleApproveHistoryPlan = () => {
    if (!historyResult) return
    setIsHistoryApplying(true)
    // Демо-применение: LAMA-задачи отдельный мир, но клиенту в демо
    // важен сам факт «план применился». Toast + закрытие Sheet'а.
    setTimeout(() => {
      toast.success(
        t("toast.history_applied", { count: historyResult.assignments.length }),
      )
      setHistorySheetOpen(false)
      setHistoryResult(null)
      setIsHistoryApplying(false)
    }, 350)
  }

  const handleCloseHistorySheet = () => {
    if (isHistoryApplying) return
    setHistorySheetOpen(false)
    setHistoryResult(null)
  }

  // Auto-distribute: алгоритм предлагает план, кладём в локальный state.
  // НЕ коммитит на сервер — директор подтверждает через StickyPlanBar.
  const handleAutoDistribute = () => {
    if (!selectedStoreId || !canEdit) return
    setIsAutoRunning(true)
    // Минимальный delay для UX чтоб кнопка показала «Распределяю…»
    setTimeout(() => {
      const proposal = autoDistribute(tasks, employees)
      if (proposal.size === 0) {
        toast.info(t("toast.auto_nothing"))
      } else {
        setPlan(proposal)
        toast.success(t("toast.auto_proposed", { count: proposal.size }))
      }
      setIsAutoRunning(false)
    }, 200)
  }

  // Sheet save → обновляем план для конкретной задачи (sync, без API)
  const handleSaveAllocation = (allocations: TaskDistributionAllocation[]) => {
    if (!selectedTask) return
    setPlan((prev) => {
      const next = new Map(prev)
      if (allocations.length === 0) {
        next.delete(selectedTask.id)
      } else {
        next.set(selectedTask.id, allocations)
      }
      return next
    })
    toast.success(t("toast.added_to_plan", { task: selectedTask.title }))
    setSheetOpen(false)
  }

  // Сбросить весь локальный план (server state не трогается)
  const handleResetPlan = () => {
    if (plan.size === 0) return
    setPlan(new Map())
    setSheetOpen(false)
    setEmployeeSheetOpen(false)
    toast.info(t("toast.plan_reset"))
  }

  // Подтвердить план — применяем все allocations через assignTaskToUser.
  // Дополнительно детектим over-shift и уведомляем supervisor+ если директор
  // назначил сотруднику работы сверх его смены.
  const handleConfirmPlan = async () => {
    if (!selectedStoreId || !canEdit || plan.size === 0) return
    // Закрываем оба sheet'а — данные under них становятся stale после refresh
    setSheetOpen(false)
    setEmployeeSheetOpen(false)
    setIsConfirming(true)

    // Детектим over-shift ДО применения (по текущему snapshot employees).
    // Сумма plan-минут per user → emp.assigned_min + extra > shift_total_min.
    const allocByUser = new Map<number, number>()
    for (const allocs of plan.values()) {
      for (const a of allocs) {
        allocByUser.set(a.userId, (allocByUser.get(a.userId) ?? 0) + a.minutes)
      }
    }
    // Threshold уведомления: >20% сверх плановой смены (per user requirement
    // «при превышении более чем на 20% от плана»). Меньшие over-shift
    // допустимы директором без эскалации supervisor.
    const overShifts: OverShiftEntry[] = []
    for (const emp of employees) {
      const additional = allocByUser.get(emp.user.id) ?? 0
      const totalAfter = emp.assigned_min + additional
      const threshold =
        emp.shift_total_min > 0 ? emp.shift_total_min * 1.2 : 0
      if (totalAfter > threshold) {
        overShifts.push({
          userId: emp.user.id,
          userName: getFullName(
            emp.user.first_name,
            emp.user.last_name,
            emp.user.middle_name
          ),
          shiftMin: emp.shift_total_min,
          totalAfterMin: totalAfter,
        })
      }
    }

    let okCount = 0
    let errCount = 0
    for (const [taskId, allocations] of plan) {
      try {
        const res = await assignTaskToUser(taskId, allocations)
        if (res.success) okCount++
        else errCount++
      } catch {
        errCount++
      }
    }

    // Уведомляем supervisor+ если директор назначил сверх плана.
    // Только для STORE_DIRECTOR — supervisor и выше сами не триггерят notification на себя.
    if (overShifts.length > 0 && user?.role === "STORE_DIRECTOR") {
      try {
        await notifyOverShiftAssignment(selectedStoreId, overShifts, {
          id: user.id,
          name: getFullName(user.first_name, user.last_name, user.middle_name),
          role: user.role,
        })
      } catch {
        // notification не критична — toast информирует пользователя
      }
    }

    // Refresh из источника
    try {
      const [tasksRes, employeesRes] = await Promise.all([
        getStoreUnassignedTasks(selectedStoreId, currentDate),
        getStoreEmployeesUtilization(selectedStoreId, currentDate),
      ])
      setTasks(tasksRes.data)
      setEmployees(employeesRes.data)
    } catch {
      // ignore — toast покажет результат
    }
    setPlan(new Map())
    if (errCount > 0) {
      toast.error(t("toast.confirm_partial", { ok: okCount, err: errCount }))
    } else if (overShifts.length > 0) {
      toast.warning(t("toast.confirm_over_shift", { count: okCount, over: overShifts.length }))
    } else {
      toast.success(t("toast.confirm_done", { count: okCount }))
    }
    setIsConfirming(false)
  }

  // Sort: нераспределённые → по priority → по зоне.
  const sortTasksForLeft = (a: UnassignedTask, b: UnassignedTask) => {
    const ar = a.remaining_minutes > 0 ? 0 : 1
    const br = b.remaining_minutes > 0 ? 0 : 1
    if (ar !== br) return ar - br
    const ap = a.priority ?? 50
    const bp = b.priority ?? 50
    if (ap !== bp) return ap - bp
    return (a.zone_name ?? "").localeCompare(b.zone_name ?? "")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumbs={[
          { label: t("breadcrumb_home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumb_tasks"), href: ADMIN_ROUTES.tasks },
          { label: t("breadcrumb_distribute") },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <StoreCombobox
          stores={stores}
          value={selectedStoreId}
          onChange={setSelectedStoreId}
          placeholder={t("toolbar.store_placeholder")}
          className="w-full sm:w-[280px]"
        />
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodTab)} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="today" className="flex-1 sm:flex-initial">
              {t("toolbar.period.today")}
            </TabsTrigger>
            <TabsTrigger value="tomorrow" className="flex-1 sm:flex-initial">
              {t("toolbar.period.tomorrow")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block w-full sm:w-auto">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAutoDistribute}
                    disabled={
                      !canEdit ||
                      isAutoRunning ||
                      isLoadingTasks ||
                      isLoadingEmployees ||
                      tasks.length === 0 ||
                      employees.length === 0
                    }
                    className="gap-1.5 w-full sm:w-auto"
                  >
                    <Wand2 className="size-4" />
                    {isAutoRunning ? t("toolbar.auto_running") : t("toolbar.auto")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {canEdit ? t("toolbar.auto_hint") : t("forbidden.tooltip")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {canRunHistoryAlgo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoDistributeHistory}
                      disabled={isHistoryRunning || isLoadingTasks}
                      className="gap-1.5 w-full sm:w-auto"
                    >
                      <Sparkles className="size-4" />
                      {isHistoryRunning
                        ? t("toolbar.auto_history_running")
                        : t("toolbar.auto_history")}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t("toolbar.auto_history_hint")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* View mode tabs — выбор ракурса */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2">
          <TabsTrigger value="by-task" className="gap-1.5">
            <ListChecks className="size-3.5" />
            <span>{t("view_mode.by_task")}</span>
          </TabsTrigger>
          <TabsTrigger value="by-employee" className="gap-1.5">
            <UsersRound className="size-3.5" />
            <span>{t("view_mode.by_employee")}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mobile utilization collapsible — только в by-task режиме (в by-employee
          сотрудники = основной контент) */}
      {viewMode === "by-task" && (
        <MobileUtilizationCollapsible
          employees={employees}
          planMinByUser={planMinByUser}
          isLoading={isLoadingEmployees}
          date={currentDate}
          t={t}
          locale={locale}
        />
      )}

      {/* Main layout — 4 квадранта (LEFT/RIGHT × by-task/by-employee) с
          идентичной Card-структурой через TasksPanel/EmployeesPanel. */}
      {viewMode === "by-task" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: Tasks (interactive) */}
          <TasksPanel
            tasks={tasks}
            plan={plan}
            date={currentDate}
            locale={locale}
            t={t}
            title={t("sections.unassigned")}
            isLoading={isLoadingTasks}
            interactive
            onTaskClick={handleDistribute}
            disabled={!canEdit}
            sortTasks={sortTasksForLeft}
          />
          {/* Right: Team utilization (read-only, desktop only) */}
          <div className="hidden lg:block">
            <EmployeesPanel
              employees={employees}
              planMinByUser={planMinByUser}
              date={currentDate}
              locale={locale}
              t={t}
              title={t("utilization.title")}
              isLoading={isLoadingEmployees}
              showFooter
            />
          </div>
        </div>
      ) : (
        // ── By Employee mode ──────────────────────────────────────────
        // Зеркальный layout к by-task: слева — кликабельные сотрудники,
        // справа — read-only сводка задач. Те же Card-обёртки.
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: Employees (interactive) */}
          <EmployeesPanel
            employees={employees}
            planMinByUser={planMinByUser}
            date={currentDate}
            locale={locale}
            t={t}
            title={t("by_employee.section_title")}
            isLoading={isLoadingEmployees}
            interactive
            onEmployeeClick={handleSelectEmployee}
          />
          {/* Right: Tasks summary (read-only, desktop only) */}
          <div className="hidden lg:block">
            <TasksPanel
              tasks={tasks}
              plan={plan}
              date={currentDate}
              locale={locale}
              t={t}
              title="Сводка по задачам"
              isLoading={isLoadingTasks}
              showFooter
            />
          </div>
        </div>
      )}

      {/* Sticky bottom bar — план для подтверждения */}
      <StickyPlanBar
        taskCount={plan.size}
        totalMinutes={Array.from(plan.values()).reduce(
          (sum, allocs) => sum + allocs.reduce((s, a) => s + a.minutes, 0),
          0
        )}
        isConfirming={isConfirming}
        canEdit={canEdit}
        onConfirm={handleConfirmPlan}
        onReset={handleResetPlan}
        t={t}
      />

      {/* Distribution Sheet — взгляд «от задачи к сотрудникам» */}
      <DistributionSheet
        task={selectedTask}
        employees={employees}
        initialAllocations={selectedTask ? plan.get(selectedTask.id) ?? [] : []}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSaveAllocation}
        canEdit={canEdit}
        t={t}
      />

      {/* Employee Sheet — взгляд «от сотрудника к задачам» */}
      <EmployeeSheet
        employee={selectedEmployee}
        tasks={tasks}
        plan={plan}
        open={employeeSheetOpen}
        onClose={() => setEmployeeSheetOpen(false)}
        onPlanChange={setPlan}
        canEdit={canEdit}
        t={t}
      />

      {/* History-driven auto-distribute Sheet (отдельный от обычного Авто) */}
      <AutoDistributeHistorySheet
        open={historySheetOpen}
        onClose={handleCloseHistorySheet}
        shopCode={selectedShopCode}
        result={historyResult}
        onApprove={handleApproveHistoryPlan}
        isApplying={isHistoryApplying}
      />
    </div>
  )
}
