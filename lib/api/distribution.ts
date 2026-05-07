import type { FunctionalRole, Task, Shift } from "@/lib/types";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_SHIFTS } from "@/lib/mock-data/shifts";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/notifications";
import type { ApiListResponse, ApiResponse, ApiMutationResponse } from "./types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface EmployeeUtilization {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    middle_name?: string;
    avatar_url?: string;
    position_name?: string;
    zones?: string[];
  };
  shift_total_min: number;
  assigned_min: number;
  utilization_pct: number;
  has_bonus_task: boolean;
  shift_start: string;
  shift_end: string;
}

export interface TaskDistributionAllocation {
  userId: number;
  minutes: number;
}

export interface UnassignedTask extends Task {
  distributed_minutes: number;
  remaining_minutes: number;
}

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA — fake UNASSIGNED_TASKS_OVERRIDE удалён, заменён на
// реальные LAMA-задачи из live API в lib/mock-data/_lama-real.ts.
// getStoreUnassignedTasks читает напрямую из MOCK_TASKS (filter
// assignee_id=null + store_id).
// ═══════════════════════════════════════════════════════════════════

// LEGACY TASK_DESCRIPTORS + UNASSIGNED_TASKS_OVERRIDE удалены полностью.
// История: git show 1a7c52ba:lib/api/distribution.ts (перед заменой
// на реальные LAMA данные из live API).

// Track task allocations in memory for demo
const taskAllocations: Map<string, TaskDistributionAllocation[]> = new Map();

// ═══════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get unassigned tasks for a store on a specific date.
 * Returns tasks where assignee_id is null and zone_id is set.
 */
export async function getStoreUnassignedTasks(
  storeId: number,
  _date: string
): Promise<ApiListResponse<UnassignedTask>> {
  await new Promise((r) => setTimeout(r, 300));

  // Unassigned задачи берём напрямую из MOCK_TASKS — больше нет fake-override.
  // Реальные LAMA-задачи в MOCK_TASKS (через _lama-real.ts) уже tagged
  // правильным store_id.
  const allUnassigned = MOCK_TASKS.filter(
    (t) =>
      t.store_id === storeId &&
      t.assignee_id === null &&
      t.assigned_to_permission === null &&
      !t.archived
  );

  // Calculate distribution status for each task
  const unassignedTasks: UnassignedTask[] = allUnassigned.map((task) => {
    const allocations = taskAllocations.get(task.id) || [];
    const distributedMinutes = allocations.reduce((sum, a) => sum + a.minutes, 0);

    return {
      ...task,
      distributed_minutes: distributedMinutes,
      remaining_minutes: task.planned_minutes - distributedMinutes,
    };
  });

  return { data: unassignedTasks, total: unassignedTasks.length, page: 1, page_size: unassignedTasks.length };
}

/**
 * Get employee utilization for a store on a specific date.
 * Combines shift data with assigned tasks to calculate workload.
 */
export async function getStoreEmployeesUtilization(
  storeId: number,
  date: string
): Promise<ApiResponse<EmployeeUtilization[]>> {
  await new Promise((r) => setTimeout(r, 350));

  // Get shifts for this store and date
  const shifts = MOCK_SHIFTS.filter(
    (s) => s.store_id === storeId && s.shift_date === date
  );

  if (shifts.length === 0) {
    return { data: [] };
  }

  // Calculate utilization for each employee on shift
  const utilizations: EmployeeUtilization[] = shifts.map((shift) => {
    const user = MOCK_USERS.find((u) => u.id === shift.user_id);

    // Calculate shift duration in minutes
    const shiftStart = new Date(shift.planned_start);
    const shiftEnd = new Date(shift.planned_end);
    const shiftTotalMin = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000);

    // Get assigned tasks for this user on this date
    const assignedTasks = MOCK_TASKS.filter(
      (t) =>
        t.assignee_id === shift.user_id &&
        t.store_id === storeId &&
        !t.archived &&
        t.state !== "COMPLETED"
    );

    const assignedMin = assignedTasks.reduce((sum, t) => sum + t.planned_minutes, 0);

    // Check if user has any bonus tasks
    const hasBonusTask = assignedTasks.some((t) => t.type === "BONUS");

    // Calculate utilization percentage
    const utilizationPct = shiftTotalMin > 0 
      ? Math.round((assignedMin / shiftTotalMin) * 100) 
      : 0;

    return {
      user: {
        id: shift.user_id,
        first_name: user?.first_name || shift.user_name.split(" ")[1] || "",
        last_name: user?.last_name || shift.user_name.split(" ")[0] || "",
        middle_name: user?.middle_name,
        avatar_url: user?.avatar_url,
        position_name: shift.zone_name,
        zones: shift.zone_name ? [shift.zone_name] : [],
      },
      shift_total_min: shiftTotalMin,
      assigned_min: assignedMin,
      utilization_pct: utilizationPct,
      has_bonus_task: hasBonusTask,
      shift_start: shift.planned_start,
      shift_end: shift.planned_end,
    };
  });

  // Sort by utilization (lowest first - most available)
  utilizations.sort((a, b) => a.utilization_pct - b.utilization_pct);

  return { data: utilizations };
}

/**
 * Get shifts for a store on a specific date.
 */
export async function getStoreShiftsToday(
  storeId: number,
  date: string
): Promise<ApiListResponse<Shift>> {
  await new Promise((r) => setTimeout(r, 200));

  const shifts = MOCK_SHIFTS.filter(
    (s) => s.store_id === storeId && s.shift_date === date
  );

  return { data: shifts, total: shifts.length, page: 1, page_size: shifts.length };
}

/**
 * Assign/distribute a task to one or more users.
 * Supports partial distribution across multiple employees.
 */
export async function assignTaskToUser(
  taskId: string,
  assignments: TaskDistributionAllocation[]
): Promise<ApiMutationResponse> {
  await new Promise((r) => setTimeout(r, 400));

  // Validate task exists
  const task = MOCK_TASKS.find((t) => t.id === taskId);

  if (!task) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Task not found",
      },
    };
  }

  // Validation удалена: директор может назначить сверх плана задачи
  // (сценарий «нужно больше работы по этой задаче чем изначально считали»).
  // Над-шифтовое over-allocation детектится в компоненте через
  // notifyOverShiftAssignment (нужны employees state и shift hours).

  // Store allocations (история распределения — для distribution-page state)
  taskAllocations.set(taskId, assignments);

  // Создаём реальные задачи на конкретных сотрудников.
  // Каждое распределение = отдельная Task в MOCK_TASKS, доступная в /tasks
  // и /tasks/{id}. Это «дробление» родительской unassigned-задачи на исполняемые.
  const now = new Date().toISOString();
  for (const a of assignments) {
    const user = MOCK_USERS.find((u) => u.id === a.userId);
    if (!user) continue;
    const userName = `${user.last_name} ${user.first_name}`;
    const childId = `${taskId}--user-${a.userId}-${Date.now()}`;
    const childTask: Task = {
      ...task,
      id: childId,
      title: `${task.title} — ${userName}`,
      planned_minutes: a.minutes,
      assignee_id: a.userId,
      assignee_name: userName,
      assigned_to_permission: null,
      state: "NEW",
      review_state: "NONE",
      source: task.source ?? "PLANNED",
      // editable_by_store false — задача спущена сверху, директор только распределил
      editable_by_store: false,
      created_at: now,
      updated_at: now,
    };
    MOCK_TASKS.push(childTask);
  }

  return { success: true };
}

/**
 * Get current allocations for a task.
 */
export async function getTaskAllocations(
  taskId: string
): Promise<ApiResponse<TaskDistributionAllocation[]>> {
  await new Promise((r) => setTimeout(r, 100));

  const allocations = taskAllocations.get(taskId) || [];

  return { data: allocations };
}

/**
 * Clear all allocations for a task.
 */
export async function clearTaskAllocations(
  taskId: string
): Promise<ApiMutationResponse> {
  await new Promise((r) => setTimeout(r, 100));

  taskAllocations.delete(taskId);

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// OVER-SHIFT NOTIFICATION
// ═══════════════════════════════════════════════════════════════════

export interface OverShiftEntry {
  userId: number;
  userName: string;
  shiftMin: number;
  /** Сколько в итоге назначено: server assigned + плановые allocations */
  totalAfterMin: number;
}

/**
 * Уведомить supervisor+ о том что директор назначил сотруднику работы
 * сверх его плановой смены. Создаёт GENERIC-уведомления в MOCK_NOTIFICATIONS
 * для каждого supervisor этого магазина.
 *
 * В моке использует hardcoded supervisor user_id=4 (Романов И. А.) — в живом
 * backend будет резолвиться через store-supervisor mapping.
 *
 * @endpoint POST /api/distribution/notify-over-shift
 */
export async function notifyOverShiftAssignment(
  storeId: number,
  overShifts: OverShiftEntry[],
  actor: { id: number; name: string; role: FunctionalRole }
): Promise<ApiResponse<{ notified_count: number }>> {
  await new Promise((r) => setTimeout(r, 100));

  if (overShifts.length === 0) {
    return { data: { notified_count: 0 } };
  }

  // Целевая аудитория — supervisor этого магазина и выше.
  // Mock: hardcoded user_id=4 (Романов, SUPERVISOR в demo-данных).
  const supervisorIds: number[] = [4];

  let count = 0;
  const bodyLines = overShifts
    .map(
      (os) =>
        `${os.userName}: смена ${(os.shiftMin / 60).toFixed(1)} ч → назначено ${(
          os.totalAfterMin / 60
        ).toFixed(1)} ч (+${((os.totalAfterMin - os.shiftMin) / 60).toFixed(1)} ч)`
    )
    .join("; ");

  for (const sup of supervisorIds) {
    MOCK_NOTIFICATIONS.unshift({
      id: `notif-overshift-${Date.now()}-${sup}`,
      user_id: sup,
      category: "GENERIC",
      title: `${actor.name} назначил сверх плана часов`,
      body: bodyLines,
      data: {
        store_id: storeId,
        actor_id: actor.id,
        actor_role: actor.role,
        over_shift_count: overShifts.length,
        over_shift_users: overShifts.map((o) => o.userId),
      },
      link: "/tasks/distribute",
      is_read: false,
      is_archived: false,
      created_at: new Date().toISOString(),
    });
    count++;
  }

  return { data: { notified_count: count } };
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-DISTRIBUTE ALGORITHM (pure, sync — no server side-effects)
// ═══════════════════════════════════════════════════════════════════

/**
 * Greedy plan: sort tasks by priority asc (1 = critical), для каждой —
 * сначала кандидаты с совпадением зоны (employee.zones ∩ task.zone_name);
 * если совпадений нет — fallback на всех со свободным временем.
 * Внутри кандидатов сортировка по убыванию свободных минут (наименее
 * загруженный первым). Аллоцируем greedy пока задача не закрыта или
 * кандидаты не закончились.
 *
 * Возвращает план — Map<taskId, allocations>. Caller показывает план в UI
 * для подтверждения, затем коммитит через assignTaskToUser per task.
 *
 * Не делает API-вызовов, не мутирует серверное состояние. Идемпотентна.
 */
export function autoDistribute(
  tasks: UnassignedTask[],
  employees: EmployeeUtilization[]
): Map<string, TaskDistributionAllocation[]> {
  const plan = new Map<string, TaskDistributionAllocation[]>();

  // Mutable per-employee free minutes — shrinks as мы аллоцируем
  const freeByUser = new Map<number, number>();
  for (const emp of employees) {
    freeByUser.set(
      emp.user.id,
      Math.max(0, emp.shift_total_min - emp.assigned_min)
    );
  }

  // Sort: priority asc (1 = high, 100 = low), затем zone alpha для группировки
  const sorted = [...tasks]
    .filter((t) => t.remaining_minutes > 0)
    .sort((a, b) => {
      const pa = a.priority ?? 100;
      const pb = b.priority ?? 100;
      if (pa !== pb) return pa - pb;
      return (a.zone_name ?? "").localeCompare(b.zone_name ?? "");
    });

  for (const task of sorted) {
    let remaining = task.remaining_minutes;
    const allocations: TaskDistributionAllocation[] = [];

    // Step 1: zone match (по shift zone сотрудника)
    const zoneMatch = task.zone_name
      ? employees.filter(
          (e) =>
            e.user.zones?.includes(task.zone_name!) &&
            (freeByUser.get(e.user.id) ?? 0) > 0
        )
      : [];

    // Step 2: fallback all available если zone match пуст
    const candidates =
      zoneMatch.length > 0
        ? zoneMatch
        : employees.filter((e) => (freeByUser.get(e.user.id) ?? 0) > 0);

    // Most-free first
    const ranked = [...candidates].sort(
      (a, b) =>
        (freeByUser.get(b.user.id) ?? 0) - (freeByUser.get(a.user.id) ?? 0)
    );

    for (const emp of ranked) {
      if (remaining <= 0) break;
      const free = freeByUser.get(emp.user.id) ?? 0;
      if (free <= 0) continue;
      const allocate = Math.min(remaining, free);
      allocations.push({ userId: emp.user.id, minutes: allocate });
      freeByUser.set(emp.user.id, free - allocate);
      remaining -= allocate;
    }

    if (allocations.length > 0) {
      plan.set(task.id, allocations);
    }
  }

  return plan;
}
