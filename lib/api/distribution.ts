import type { Task, Shift } from "@/lib/types";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_SHIFTS } from "@/lib/mock-data/shifts";
import { MOCK_USERS } from "@/lib/mock-data/users";
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
// MOCK DATA - Unassigned Tasks for Distribution
// ═══════════════════════════════════════════════════════════════════

const UNASSIGNED_TASKS_OVERRIDE: Partial<Task>[] = [
  {
    id: "task-unassigned-001",
    title: "Выкладка молочки в холодильники 1-4",
    description: "Полная перевыкладка молочной продукции по новой планограмме от 30 апреля. Контроль сроков годности.",
    type: "PLANNED",
    kind: "SINGLE",
    source: "PLANNED",
    planned_minutes: 180,
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 6,
    zone_name: "Холодильники",
    work_type_id: 4,
    work_type_name: "Выкладка",
    product_category_id: 1,
    product_category_name: "Молочка",
    creator_id: 5,
    creator_name: "Иванов Александр Сергеевич",
    assignee_id: null,
    assignee_name: null,
    assigned_to_permission: null,
    state: "NEW",
    review_state: "NONE",
    acceptance_policy: "MANUAL",
    requires_photo: true,
    time_start: "08:00:00",
    time_end: "11:00:00",
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "task-unassigned-002",
    title: "Уценка хлеба с истекающим сроком",
    description: "Маркировка и переоценка хлебобулочных изделий со сроком годности < 2 дней. Перенос на стеллаж «Скидки».",
    type: "PLANNED",
    kind: "SINGLE",
    source: "MANAGER",
    planned_minutes: 90,
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    work_type_id: 5,
    work_type_name: "Переоценка",
    product_category_id: 2,
    product_category_name: "Хлебобулочка",
    creator_id: 5,
    creator_name: "Иванов Александр Сергеевич",
    assignee_id: null,
    assignee_name: null,
    assigned_to_permission: null,
    state: "NEW",
    review_state: "NONE",
    acceptance_policy: "MANUAL",
    requires_photo: false,
    time_start: "09:00:00",
    time_end: "10:30:00",
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "task-unassigned-003",
    title: "Инвентаризация консервов на складе",
    description: "Полный пересчёт консервации в секторе Б. Сверка с остатками в 1С, оформление акта расхождений.",
    type: "PLANNED",
    kind: "SINGLE",
    source: "PLANNED",
    planned_minutes: 120,
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 2,
    zone_name: "Склад",
    work_type_id: 6,
    work_type_name: "Инвентаризация",
    product_category_id: 8,
    product_category_name: "Консервация",
    creator_id: 5,
    creator_name: "Иванов Александр Сергеевич",
    assignee_id: null,
    assignee_name: null,
    assigned_to_permission: null,
    state: "NEW",
    review_state: "NONE",
    acceptance_policy: "MANUAL",
    requires_photo: true,
    time_start: "10:00:00",
    time_end: "12:00:00",
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "task-unassigned-004",
    title: "Ротация напитков и соков",
    description: "Ротация по FIFO на стеллажах напитков 5-8. Проверка сроков, перестановка товара.",
    type: "PLANNED",
    kind: "SINGLE",
    source: "AI",
    ai_suggestion_id: "ai-sug-distribution-001",
    planned_minutes: 60,
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    work_type_id: 4,
    work_type_name: "Выкладка",
    product_category_id: 5,
    product_category_name: "Напитки",
    creator_id: 5,
    creator_name: "Иванов Александр Сергеевич",
    assignee_id: null,
    assignee_name: null,
    assigned_to_permission: null,
    state: "NEW",
    review_state: "NONE",
    acceptance_policy: "AUTO",
    requires_photo: false,
    time_start: "11:00:00",
    time_end: "12:00:00",
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "task-unassigned-005",
    title: "Приёмка фруктов от поставщика",
    description: "Приёмка партии фруктов от ООО «Свежесть». Контроль качества, температурного режима, сроков.",
    type: "PLANNED",
    kind: "SINGLE",
    source: "PLANNED",
    planned_minutes: 45,
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 2,
    zone_name: "Склад",
    work_type_id: 13,
    work_type_name: "Складские работы",
    product_category_id: 9,
    product_category_name: "Фрукты и овощи",
    creator_id: 5,
    creator_name: "Иванов Александр Сергеевич",
    assignee_id: null,
    assignee_name: null,
    assigned_to_permission: null,
    state: "NEW",
    review_state: "NONE",
    acceptance_policy: "MANUAL",
    requires_photo: true,
    time_start: "07:00:00",
    time_end: "07:45:00",
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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

  // Combine real unassigned from MOCK_TASKS + our override tasks
  const realUnassigned = MOCK_TASKS.filter(
    (t) =>
      t.store_id === storeId &&
      t.assignee_id === null &&
      t.assigned_to_permission === null &&
      !t.archived
  );

  const overrideTasks = UNASSIGNED_TASKS_OVERRIDE.filter(
    (t) => t.store_id === storeId
  ) as Task[];

  const allUnassigned = [...overrideTasks, ...realUnassigned];

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

  return {
    success: true,
    data: unassignedTasks,
    meta: {
      total: unassignedTasks.length,
      page: 1,
      page_size: unassignedTasks.length,
      total_pages: 1,
    },
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

  // Get shifts for this store and date
  const shifts = MOCK_SHIFTS.filter(
    (s) => s.store_id === storeId && s.shift_date === date
  );

  if (shifts.length === 0) {
    return {
      success: true,
      data: [],
    };
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

  return {
    success: true,
    data: utilizations,
  };
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

  return {
    success: true,
    data: shifts,
    meta: {
      total: shifts.length,
      page: 1,
      page_size: shifts.length,
      total_pages: 1,
    },
  };
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
  const allTasks = [...MOCK_TASKS, ...(UNASSIGNED_TASKS_OVERRIDE as Task[])];
  const task = allTasks.find((t) => t.id === taskId);

  if (!task) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Task not found",
      },
    };
  }

  // Validate total doesn't exceed planned minutes
  const totalMinutes = assignments.reduce((sum, a) => sum + a.minutes, 0);
  if (totalMinutes > task.planned_minutes) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Total assigned minutes exceeds planned minutes",
      },
    };
  }

  // Store allocations
  taskAllocations.set(taskId, assignments);

  return {
    success: true,
    data: { id: taskId },
  };
}

/**
 * Get current allocations for a task.
 */
export async function getTaskAllocations(
  taskId: string
): Promise<ApiResponse<TaskDistributionAllocation[]>> {
  await new Promise((r) => setTimeout(r, 100));

  const allocations = taskAllocations.get(taskId) || [];

  return {
    success: true,
    data: allocations,
  };
}

/**
 * Clear all allocations for a task.
 */
export async function clearTaskAllocations(
  taskId: string
): Promise<ApiMutationResponse> {
  await new Promise((r) => setTimeout(r, 100));

  taskAllocations.delete(taskId);

  return {
    success: true,
    data: { id: taskId },
  };
}
