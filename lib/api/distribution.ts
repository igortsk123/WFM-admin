import type { FunctionalRole, Task, Shift, UnassignedTaskBlock } from "@/lib/types";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/notifications";
import { MOCK_UNASSIGNED_BLOCKS } from "@/lib/mock-data/_lama-unassigned-blocks";
import {
  USERS_BY_ID,
  SHIFTS_BY_STORE_DATE,
  TASKS_BY_ASSIGNEE,
} from "@/lib/mock-data/_indexes";
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

/** Hard cap чтоб даже на гипермаркете с 80+ unassigned задачами UI не лагал. */
const UNASSIGNED_HARD_CAP = 100;

/**
 * Get unassigned tasks for a store on a specific date.
 * Returns tasks where assignee_id is null and zone_id is set.
 * Capped at UNASSIGNED_HARD_CAP — реалистично для одного дня одного магазина.
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

  // Cap для предотвращения UI-лага на больших магазинах (Г-1 имеет 81 emp).
  const capped = allUnassigned.slice(0, UNASSIGNED_HARD_CAP);

  // Calculate distribution status for each task
  const unassignedTasks: UnassignedTask[] = capped.map((task) => {
    const allocations = taskAllocations.get(task.id) || [];
    const distributedMinutes = allocations.reduce((sum, a) => sum + a.minutes, 0);

    return {
      ...task,
      distributed_minutes: distributedMinutes,
      remaining_minutes: task.planned_minutes - distributedMinutes,
    };
  });

  return {
    data: unassignedTasks,
    total: allUnassigned.length,
    page: 1,
    page_size: UNASSIGNED_HARD_CAP,
  };
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

  // Use indexed lookup: O(1) вместо O(n) фильтра.
  const shifts = (SHIFTS_BY_STORE_DATE.get(`${storeId}:${date}`) ?? []);

  if (shifts.length === 0) {
    return { data: [] };
  }

  // Calculate utilization for each employee on shift
  const utilizations: EmployeeUtilization[] = shifts.map((shift) => {
    const user = USERS_BY_ID.get(shift.user_id);

    // Calculate shift duration in minutes
    const shiftStart = new Date(shift.planned_start);
    const shiftEnd = new Date(shift.planned_end);
    const shiftTotalMin = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 60000);

    // Tasks for this user — O(1) lookup, потом малый filter.
    const userTasks = TASKS_BY_ASSIGNEE.get(shift.user_id) ?? [];
    const assignedTasks = userTasks.filter(
      (t) =>
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

  const shifts = SHIFTS_BY_STORE_DATE.get(`${storeId}:${date}`) ?? [];

  return { data: shifts, total: shifts.length, page: 1, page_size: shifts.length };
}

// ═══════════════════════════════════════════════════════════════════
// UNASSIGNED TASK BLOCKS — главное API распределения задач
// ═══════════════════════════════════════════════════════════════════
//
// Блоки приходят из LAMA как сводки трудозатрат на магазин:
// «Выкладка ФРОВ — 480 минут на день». Директор/ИИ их распределяет
// на конкретных сотрудников → блок «лопается» на N задач в MOCK_TASKS.
//
// Backend сейчас НЕ имеет endpoint'а для блоков (admin-only концепция).
// Будем просить backend добавить /tasks/unassigned-blocks (см. MIGRATION-NOTES).

/** In-memory state блоков (мутируем при распределении). */
const blockState: Map<string, UnassignedTaskBlock> = new Map(
  MOCK_UNASSIGNED_BLOCKS.map((b) => [b.id, { ...b }]),
);

/**
 * Получить нераспределённые блоки для магазина на дату.
 *
 * @admin-only — backend пока не имеет эндпоинта для блоков.
 *               См. MIGRATION-NOTES.md, request "GET /tasks/unassigned-blocks".
 */
export async function getStoreUnassignedBlocks(
  storeId: number,
  date: string,
): Promise<ApiListResponse<UnassignedTaskBlock>> {
  await new Promise((r) => setTimeout(r, 250));

  const all = Array.from(blockState.values()).filter(
    (b) =>
      b.store_id === storeId &&
      b.date === date &&
      !b.is_distributed,
  );

  // Sort: priority (1 = critical) сверху, потом по time_total убыв.
  all.sort((a, b) => {
    const pa = a.priority ?? 50;
    const pb = b.priority ?? 50;
    if (pa !== pb) return pa - pb;
    return b.total_minutes - a.total_minutes;
  });

  return { data: all, total: all.length, page: 1, page_size: all.length };
}

export interface BlockAllocation {
  user_id: number;
  user_name: string;
  minutes: number;
}

/**
 * Распределить блок на сотрудников. Лопает блок:
 *   - в MOCK_TASKS добавляются N новых Task (по одной на каждого user_id)
 *   - блок помечается is_distributed=true (или partial если minutes < total)
 *   - возвращает spawned task IDs
 *
 * @admin-only — это admin distribute flow, backend получит уже готовые Task'и.
 */
export async function distributeBlock(
  blockId: string,
  allocations: BlockAllocation[],
): Promise<ApiMutationResponse & { task_ids?: string[] }> {
  await new Promise((r) => setTimeout(r, 350));

  const block = blockState.get(blockId);
  if (!block) {
    return {
      success: false,
      error: { code: "BLOCK_NOT_FOUND", message: `Block ${blockId} not found` },
    };
  }
  if (block.is_distributed) {
    return {
      success: false,
      error: { code: "ALREADY_DISTRIBUTED", message: "Блок уже распределён" },
    };
  }

  const totalAllocated = allocations.reduce((s, a) => s + a.minutes, 0);
  if (totalAllocated > block.remaining_minutes) {
    return {
      success: false,
      error: {
        code: "EXCEEDS_REMAINING",
        message: `Распределено ${totalAllocated} мин, но в блоке осталось ${block.remaining_minutes} мин`,
      },
    };
  }

  // Spawn N tasks (по одной на каждого user_id из allocations)
  const today = new Date().toISOString();
  const spawnedIds: string[] = [];
  for (const alloc of allocations) {
    const taskId = `task-from-${blockId}-${alloc.user_id}-${Date.now()}`;
    const newTask: Task = {
      id: taskId,
      title: block.title,
      description: `Распределено директором из блока «${block.title}» (${block.total_minutes} мин на ${block.zone_name})`,
      type: "PLANNED",
      kind: "SINGLE",
      source: "PLANNED",
      planned_minutes: alloc.minutes,
      store_id: block.store_id,
      store_name: block.store_name,
      zone_id: block.zone_id,
      zone_name: block.zone_name,
      work_type_id: block.work_type_id,
      work_type_name: block.work_type_name,
      product_category_id: block.product_category_id ?? null,
      product_category_name: block.product_category_name ?? null,
      creator_id: 0, // будет установлен из контекста UI
      creator_name: "Директор магазина",
      assignee_id: alloc.user_id,
      assignee_name: alloc.user_name,
      assigned_to_permission: null,
      state: "NEW",
      review_state: "NONE",
      acceptance_policy: "MANUAL",
      requires_photo: false,
      archived: false,
      priority: block.priority,
      created_at: today,
      updated_at: today,
    };
    MOCK_TASKS.push(newTask);
    spawnedIds.push(taskId);
  }

  // Update block state
  block.distributed_minutes += totalAllocated;
  block.remaining_minutes = block.total_minutes - block.distributed_minutes;
  block.is_distributed = block.remaining_minutes <= 0;
  block.spawned_task_ids = [...(block.spawned_task_ids ?? []), ...spawnedIds];

  return { success: true, task_ids: spawnedIds };
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
