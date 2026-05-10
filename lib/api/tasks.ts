/**
 * Tasks API - Task management, review workflows, and subtasks.
 * Single integration point for task CRUD and state transitions.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Task,
  TaskState,
  TaskReviewState,
  TaskEvent,
  Operation,
  Hint,
  Zone,
  WorkType,
  ProductCategory,
  User,
  ArchiveReason,
  Permission,
} from "@/lib/types";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_OPERATIONS } from "@/lib/mock-data/subtasks";
import { MOCK_HINTS } from "@/lib/mock-data/hints";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_PRODUCT_CATEGORIES } from "@/lib/mock-data/product-categories";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms: number = 300) => new Promise((r) => setTimeout(r, ms));

/** Task with optional assignee avatar */
export interface TaskWithAvatar extends Task {
  assignee_avatar?: string;
}

/** Full task detail with history, subtasks, and hints */
export interface TaskDetail extends Task {
  history: TaskEvent[];
  subtasks: Operation[];
  hints: Hint[];
}

/** Task filter parameters */
export interface TaskListParams extends ApiListParams {
  assignment_id?: number;
  state?: TaskState;
  review_state?: TaskReviewState;
  zone_ids?: number[];
  work_type_ids?: number[];
  assignee_ids?: number[];
  store_ids?: number[];
  category_id?: number;
  date_from?: string;
  date_to?: string;
  /** When true — return only archived tasks; when false/undefined — return only active */
  archived?: boolean;
}

/** Task filters response for filter dropdowns */
export interface TaskFiltersResponse {
  zones: Zone[];
  work_types: WorkType[];
  product_categories: ProductCategory[];
  assignees: User[];
}

/** Operation with parent task title for pending lists */
export interface OperationWithTaskTitle extends Operation {
  task_title: string;
  task_id_display: string;
  store_id: number;
  store_name: string;
  store_external_code: string;
  zone_id: number;
  zone_name: string;
  work_type_id: number;
  work_type_name: string;
  /** Worker who proposed the subtask (inferred from task assignee) */
  proposed_by?: {
    id: number;
    first_name: string;
    last_name: string;
    middle_name?: string;
    position_name: string;
    avatar_url?: string;
  };
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════
// TASK LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of tasks with filtering.
 * @param params Filter and pagination parameters
 * @returns Paginated list of tasks with assignee avatars
 * @endpoint GET /tasks/list
 */
export async function getTasks(
  params: TaskListParams = {}
): Promise<ApiListResponse<TaskWithAvatar>> {
  await delay(400);

  const {
    search,
    state,
    review_state,
    zone_ids,
    work_type_ids,
    assignee_ids,
    store_ids,
    category_id,
    date_from,
    date_to,
    archived = false,
    page = 1,
    page_size = 20,
    sort_by = "created_at",
    sort_dir = "desc",
  } = params;

  let filtered = [...MOCK_TASKS];

  // Filter by archived flag
  filtered = filtered.filter((t) => t.archived === archived);

  // Filter by state
  if (state) {
    filtered = filtered.filter((t) => t.state === state);
  }

  // Filter by review state
  if (review_state) {
    filtered = filtered.filter((t) => t.review_state === review_state);
  }

  // Filter by stores
  if (store_ids && store_ids.length > 0) {
    filtered = filtered.filter((t) => store_ids.includes(t.store_id));
  }

  // Filter by zones
  if (zone_ids && zone_ids.length > 0) {
    filtered = filtered.filter((t) => zone_ids.includes(t.zone_id));
  }

  // Filter by work types
  if (work_type_ids && work_type_ids.length > 0) {
    filtered = filtered.filter((t) => work_type_ids.includes(t.work_type_id));
  }

  // Filter by assignees
  if (assignee_ids && assignee_ids.length > 0) {
    filtered = filtered.filter(
      (t) => t.assignee_id && assignee_ids.includes(t.assignee_id)
    );
  }

  // Filter by product category
  if (category_id) {
    filtered = filtered.filter((t) => t.product_category_id === category_id);
  }

  // Filter by date range
  if (date_from) {
    filtered = filtered.filter((t) => t.created_at >= date_from);
  }
  if (date_to) {
    filtered = filtered.filter((t) => t.created_at <= date_to);
  }

  // Search by title
  if (search) {
    const lowerSearch = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerSearch) ||
        t.description.toLowerCase().includes(lowerSearch)
    );
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sort_by as keyof Task];
    const bVal = b[sort_by as keyof Task];
    if (aVal === undefined) return 1;
    if (bVal === undefined) return -1;
    const cmp = String(aVal).localeCompare(String(bVal));
    return sort_dir === "asc" ? cmp : -cmp;
  });

  // Paginate
  const total = filtered.length;
  const start = (page - 1) * page_size;
  const paginated = filtered.slice(start, start + page_size);

  // Enrich with assignee avatar
  const enriched: TaskWithAvatar[] = paginated.map((task) => {
    const assignee = task.assignee_id
      ? MOCK_USERS.find((u) => u.id === task.assignee_id)
      : null;
    return {
      ...task,
      assignee_avatar: assignee?.avatar_url,
    };
  });

  return {
    data: enriched,
    total,
    page,
    page_size,
  };
}

/**
 * Get single task by ID with full history, subtasks, and hints.
 * @param id Task ID (UUID string)
 * @returns Task with history, subtasks, and hints
 * @endpoint GET /tasks/:id
 */
export async function getTaskById(id: string): Promise<ApiResponse<TaskDetail>> {
  await delay(350);

  const task = MOCK_TASKS.find((t) => t.id === id);
  if (!task) {
    throw new Error(`Task with ID ${id} not found`);
  }

  // Get subtasks for this task
  const subtasks = MOCK_OPERATIONS.filter((s) => s.task_id === id);

  // Get hints for this task's work_type and zone
  const hints = MOCK_HINTS.filter(
    (h) => h.work_type_id === task.work_type_id && h.zone_id === task.zone_id
  );

  // Generate mock history based on task state
  const history: TaskEvent[] = [];
  let eventId = 1;

  // Rich history for demo task t-1042
  if (task.id === "t-1042") {
    const base = "2026-04-28T";
    const tz = "+07:00";
    history.push(
      { id: eventId++, task_id: task.id, event_type: "START", actor_id: 5, actor_name: "Иванов Александр Сергеевич", actor_role: "SUPERVISOR", payload: {}, occurred_at: `${base}07:00:00${tz}` },
      { id: eventId++, task_id: task.id, event_type: "TRANSFER", actor_id: 5, actor_name: "Иванов Александр Сергеевич", actor_role: "SUPERVISOR", payload: { to_name: "Козлова Дарья Андреевна" }, occurred_at: `${base}07:02:00${tz}` },
      { id: eventId++, task_id: task.id, event_type: "START", actor_id: 15, actor_name: "Козлова Дарья Андреевна", actor_role: "WORKER", payload: {}, occurred_at: `${base}09:38:00${tz}` },
      { id: eventId++, task_id: task.id, event_type: "PAUSE", actor_id: 15, actor_name: "Козлова Дарья Андреевна", actor_role: "WORKER", payload: { reason: "Перерыв на 7 мин" }, occurred_at: `${base}10:05:00${tz}` },
      { id: eventId++, task_id: task.id, event_type: "RESUME", actor_id: 15, actor_name: "Козлова Дарья Андреевна", actor_role: "WORKER", payload: {}, occurred_at: `${base}10:12:00${tz}` },
      { id: eventId++, task_id: task.id, event_type: "COMPLETE", actor_id: 15, actor_name: "Козлова Дарья Андреевна", actor_role: "WORKER", payload: {}, occurred_at: `${base}10:30:00${tz}` },
      { id: eventId++, task_id: task.id, event_type: "SEND_TO_REVIEW", actor_id: 15, actor_name: "Козлова Дарья Андреевна", actor_role: "WORKER", payload: {}, occurred_at: `${base}10:32:00${tz}` },
      { id: eventId++, task_id: task.id, event_type: "START", actor_id: 5, actor_name: "Иванов Александр Сергеевич", actor_role: "SUPERVISOR", payload: { note: "Задача создана из планировщика, назначена менеджером" }, occurred_at: `${base}07:00:00${tz}` },
    );
    // Sort newest first
    history.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  } else {
    if (task.history_brief?.opened_at) {
      history.push({
        id: eventId++,
        task_id: task.id,
        event_type: "START",
        actor_id: task.assignee_id ?? task.creator_id,
        actor_name: task.assignee_name ?? task.creator_name,
        actor_role: "WORKER",
        payload: {},
        occurred_at: task.history_brief.opened_at,
      });
    }

    if (
      task.history_brief?.paused_intervals &&
      task.history_brief.paused_intervals.length > 0
    ) {
      task.history_brief.paused_intervals.forEach((interval) => {
        history.push({
          id: eventId++,
          task_id: task.id,
          event_type: "PAUSE",
          actor_id: task.assignee_id ?? task.creator_id,
          actor_name: task.assignee_name ?? task.creator_name,
          actor_role: "WORKER",
          payload: {},
          occurred_at: interval.from,
        });
        history.push({
          id: eventId++,
          task_id: task.id,
          event_type: "RESUME",
          actor_id: task.assignee_id ?? task.creator_id,
          actor_name: task.assignee_name ?? task.creator_name,
          actor_role: "WORKER",
          payload: {},
          occurred_at: interval.to,
        });
      });
    }

    if (task.state === "COMPLETED") {
      history.push({
        id: eventId++,
        task_id: task.id,
        event_type: "COMPLETE",
        actor_id: task.assignee_id ?? task.creator_id,
        actor_name: task.assignee_name ?? task.creator_name,
        actor_role: "WORKER",
        payload: {},
        occurred_at: task.history_brief?.completed_at ?? task.updated_at,
      });
    }

    if (task.review_state === "ON_REVIEW") {
      history.push({
        id: eventId++,
        task_id: task.id,
        event_type: "SEND_TO_REVIEW",
        actor_id: task.assignee_id ?? task.creator_id,
        actor_name: task.assignee_name ?? task.creator_name,
        actor_role: "WORKER",
        payload: {},
        occurred_at: task.updated_at,
      });
    }

    if (task.review_state === "ACCEPTED") {
      history.push({
        id: eventId++,
        task_id: task.id,
        event_type: task.acceptance_policy === "AUTO" ? "AUTO_ACCEPT" : "ACCEPT",
        actor_id: task.creator_id,
        actor_name: task.creator_name,
        actor_role: "SUPERVISOR",
        payload: {},
        occurred_at: task.updated_at,
      });
    }

    if (task.review_state === "REJECTED") {
      history.push({
        id: eventId++,
        task_id: task.id,
        event_type: "REJECT",
        actor_id: task.creator_id,
        actor_name: task.creator_name,
        actor_role: "SUPERVISOR",
        payload: { reason: task.review_comment },
        occurred_at: task.updated_at,
      });
    }
  }

  return {
    data: {
      ...task,
      history,
      subtasks,
      hints,
    },
  };
}

/**
 * Get available filter options for task list (zones, work types, etc.).
 * @param assignmentId Assignment ID to scope filters
 * @returns Filter options for dropdowns
 * @endpoint GET /tasks/list/filters
 */
export async function getTaskFilters(
  assignmentId: number
): Promise<ApiResponse<TaskFiltersResponse>> {
  await delay(250);

  // For now, return all options (in real app, would scope by assignment)
  // Using assignmentId to log — will be used for scoping when connected to backend.
  // Sort: real LAMA сотрудники (id 300+) первыми чтобы demo-фильтр показывал
  // живые ФИО Томск/Северск/Новосибирск, а не synthetic 1-29.
  const assignees = MOCK_USERS
    .filter((u) => !u.archived && u.type === "STAFF")
    .sort((a, b) => b.id - a.id);

  return {
    data: {
      zones: MOCK_ZONES.filter((z) => z.approved),
      work_types: MOCK_WORK_TYPES.filter((w) => w.id < 20), // Retail only
      product_categories: MOCK_PRODUCT_CATEGORIES,
      assignees: assignees.slice(0, 30),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// TASK CRUD
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new task.
 * @param data Partial task data
 * @returns Success status with new task ID
 * @endpoint POST /tasks
 */
export async function createTask(
  data: Partial<Task>
): Promise<ApiMutationResponse> {
  await delay(400);

  const { title, store_id, zone_id, work_type_id } = data;

  if (!title || !store_id || !zone_id || !work_type_id) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Title, store, zone, and work type are required",
      },
    };
  }

  const newId = `task-${Date.now()}`;

  return {
    success: true,
    id: newId,
  };
}

/**
 * Update task data.
 * @param id Task ID
 * @param data Partial task data to update
 * @returns Success status
 * @endpoint PATCH /tasks/:id
 */
export async function updateTask(
  id: string,
  data: Partial<Task>
): Promise<ApiMutationResponse> {
  await delay(350);

  const task = MOCK_TASKS.find((t) => t.id === id);
  if (!task) {
    return {
      success: false,
      error: {
        code: "TASK_NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  if (task.archived) {
    return {
      success: false,
      error: {
        code: "TASK_ARCHIVED",
        message: "Cannot update archived task",
      },
    };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// ARCHIVE & RESTORE
// ═══════════════════════════════════════════════════════════════════

/**
 * Archive a task (soft-delete with reason).
 * @param id Task ID
 * @param reason Archive reason
 * @param comment Optional comment
 * @returns Success status
 * @endpoint POST /tasks/:id/archive
 */
export async function archiveTask(
  id: string,
  reason: ArchiveReason,
  comment?: string
): Promise<ApiMutationResponse> {
  await delay(350);

  const task = MOCK_TASKS.find((t) => t.id === id);
  if (!task) {
    return {
      success: false,
      error: {
        code: "TASK_NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  if (task.archived) {
    return {
      success: false,
      error: {
        code: "ALREADY_ARCHIVED",
        message: "Task is already archived",
      },
    };
  }

  return { success: true };
}

/**
 * Restore a task from archive (SUPERVISOR / REGIONAL / NETWORK_OPS only).
 * @param id Task ID
 * @returns Success status
 * @endpoint POST /tasks/:id/restore
 */
export async function restoreTask(id: string): Promise<ApiMutationResponse> {
  await delay(350);

  const task = MOCK_TASKS.find((t) => t.id === id);
  if (!task) {
    return {
      success: false,
      error: {
        code: "TASK_NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  if (!task.archived) {
    return {
      success: false,
      error: {
        code: "NOT_ARCHIVED",
        message: "Task is not archived",
      },
    };
  }

  return { success: true };
}

/**
 * Bulk archive multiple tasks.
 * @param taskIds Array of task IDs
 * @param reason Archive reason for all tasks
 * @returns Success status
 * @endpoint POST /tasks/bulk-archive
 */
export async function bulkArchiveTasks(
  taskIds: string[],
  reason: ArchiveReason
): Promise<ApiMutationResponse> {
  await delay(450);

  if (taskIds.length === 0) {
    return {
      success: false,
      error: {
        code: "EMPTY_LIST",
        message: "No task IDs provided",
      },
    };
  }

  // Check all tasks exist
  const missingIds = taskIds.filter((id) => !MOCK_TASKS.find((t) => t.id === id));
  if (missingIds.length > 0) {
    return {
      success: false,
      error: {
        code: "TASKS_NOT_FOUND",
        message: `Tasks not found: ${missingIds.join(", ")}`,
      },
    };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// TASK ACTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Transfer task to another assignee (for CHAIN workflows).
 * @param id Task ID
 * @param nextAssigneeId Next assignee user ID (or null to unassign)
 * @param nextPermission Optional: assign to permission instead of user
 * @returns Success status
 * @endpoint POST /tasks/:id/transfer
 */
export async function transferTask(
  id: string,
  nextAssigneeId: number | null,
  nextPermission?: Permission
): Promise<ApiMutationResponse> {
  await delay(350);

  const task = MOCK_TASKS.find((t) => t.id === id);
  if (!task) {
    return {
      success: false,
      error: {
        code: "TASK_NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  if (nextAssigneeId) {
    const assignee = MOCK_USERS.find((u) => u.id === nextAssigneeId);
    if (!assignee) {
      return {
        success: false,
        error: {
          code: "ASSIGNEE_NOT_FOUND",
          message: `User with ID ${nextAssigneeId} not found`,
        },
      };
    }
    console.log(
      `[v0] Transferred task ${id} to ${assignee.first_name} ${assignee.last_name}`
    );
  } else if (nextPermission) {
  } else {
  }

  return { success: true };
}

/**
 * Approve a completed task.
 * @param id Task ID
 * @param comment Optional approval comment
 * @returns Success status
 * @endpoint POST /tasks/:id/approve
 */
export async function approveTask(
  id: string,
  comment?: string
): Promise<ApiMutationResponse> {
  await delay(300);

  const task = MOCK_TASKS.find((t) => t.id === id);
  if (!task) {
    return {
      success: false,
      error: {
        code: "TASK_NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  if (task.review_state !== "ON_REVIEW") {
    return {
      success: false,
      error: {
        code: "NOT_ON_REVIEW",
        message: "Task is not pending review",
      },
    };
  }

  return { success: true };
}

/**
 * Reject a completed task and send back for rework.
 * @param id Task ID
 * @param reason Rejection reason (required)
 * @returns Success status
 * @endpoint POST /tasks/:id/reject
 */
export async function rejectTask(
  id: string,
  reason: string
): Promise<ApiMutationResponse> {
  await delay(300);

  const task = MOCK_TASKS.find((t) => t.id === id);
  if (!task) {
    return {
      success: false,
      error: {
        code: "TASK_NOT_FOUND",
        message: `Task with ID ${id} not found`,
      },
    };
  }

  if (task.review_state !== "ON_REVIEW") {
    return {
      success: false,
      error: {
        code: "NOT_ON_REVIEW",
        message: "Task is not pending review",
      },
    };
  }

  if (!reason.trim()) {
    return {
      success: false,
      error: {
        code: "REASON_REQUIRED",
        message: "Rejection reason is required",
      },
    };
  }

  return { success: true };
}

/**
 * Bulk assign multiple tasks to a single assignee.
 * @param taskIds Array of task IDs
 * @param assigneeId Assignee user ID
 * @returns Success status
 * @endpoint POST /tasks/bulk-assign
 */
export async function bulkAssignTasks(
  taskIds: string[],
  assigneeId: number
): Promise<ApiMutationResponse> {
  await delay(400);

  if (taskIds.length === 0) {
    return {
      success: false,
      error: {
        code: "EMPTY_LIST",
        message: "No task IDs provided",
      },
    };
  }

  const assignee = MOCK_USERS.find((u) => u.id === assigneeId);
  if (!assignee) {
    return {
      success: false,
      error: {
        code: "ASSIGNEE_NOT_FOUND",
        message: `User with ID ${assigneeId} not found`,
      },
    };
  }

  console.log(
    `[v0] Bulk assigned ${taskIds.length} tasks to ${assignee.first_name} ${assignee.last_name}`
  );
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// SUBTASKS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get pending subtasks (awaiting moderation).
 * @param params Filter parameters (store_id, work_type_id, zone_id, search, pagination)
 * @returns Paginated list of enriched pending subtasks
 * @endpoint GET /tasks/subtasks/pending
 */
export async function getPendingOperations(
  params: ApiListParams & {
    store_id?: number;
    work_type_id?: number;
    zone_id?: number;
  } = {}
): Promise<ApiListResponse<OperationWithTaskTitle>> {
  await delay(300);

  const { store_id, work_type_id, zone_id, search, page = 1, page_size = 20 } = params;

  // Get pending subtasks
  const pending = MOCK_OPERATIONS.filter((s) => s.review_state === "PENDING");

  // Enrich all pending with task/store/zone/work_type data first (needed for filtering)
  const nowIso = new Date("2026-05-01T10:00:00+07:00").toISOString();
  const daysBack = (d: number) =>
    new Date(new Date("2026-05-01T10:00:00+07:00").getTime() - d * 24 * 60 * 60 * 1000).toISOString();

  // proposed_by теперь деривируется из task.assignee_id (real LAMA worker
  // на задаче). Раньше тут был hardcoded mapping subtask.id → синтетические
  // ФИО ("Иван Иванов", "Сергей Петров") — заменено на лукап в MOCK_USERS
  // чтобы demo показывал реальных ЛАМА сотрудников Томск/Северск/Новосибирск.

  // created_at: для каждого subtask — стабильный псевдослучайный days back
  // на основе id (не Math.random — нам нужно стабильно между загрузками).
  const stableDaysBack = (subtaskId: number): string => {
    const days = (subtaskId * 17) % 9; // 0-8 days back, deterministic
    return daysBack(days);
  };

  // Build enriched list
  const enrichedAll: OperationWithTaskTitle[] = pending.map((subtask) => {
    const task = MOCK_TASKS.find((t) => t.id === subtask.task_id);
    const assigneeUser = task?.assignee_id
      ? MOCK_USERS.find((u) => u.id === task.assignee_id)
      : undefined;
    const assigneeAssignment = assigneeUser
      ? MOCK_ASSIGNMENTS.find(
          (a) => a.user_id === assigneeUser.id && a.active,
        )
      : undefined;

    const proposedBy = assigneeUser
      ? {
          id: assigneeUser.id,
          first_name: assigneeUser.first_name,
          last_name: assigneeUser.last_name,
          middle_name: assigneeUser.middle_name,
          position_name: assigneeAssignment?.position_name ?? "—",
          avatar_url: assigneeUser.avatar_url,
        }
      : undefined;

    return {
      ...subtask,
      task_title: task?.title ?? "—",
      task_id_display: task?.id ?? subtask.task_id,
      store_id: task?.store_id ?? 0,
      store_name: task?.store_name ?? "—",
      store_external_code: "", // filled below
      zone_id: task?.zone_id ?? 0,
      zone_name: task?.zone_name ?? "—",
      work_type_id: task?.work_type_id ?? 0,
      work_type_name: task?.work_type_name ?? "—",
      proposed_by: proposedBy,
      created_at: stableDaysBack(subtask.id),
    };
  });

  let filtered = enrichedAll;

  // Filter by store
  if (store_id) {
    filtered = filtered.filter((s) => s.store_id === store_id);
  }

  // Filter by work type
  if (work_type_id) {
    filtered = filtered.filter((s) => s.work_type_id === work_type_id);
  }

  // Filter by zone
  if (zone_id) {
    filtered = filtered.filter((s) => s.zone_id === zone_id);
  }

  // Search by subtask name or work type name
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.work_type_name.toLowerCase().includes(q)
    );
  }

  // Paginate
  const total = filtered.length;
  const start = (page - 1) * page_size;
  const paginated = filtered.slice(start, start + page_size);

  return {
    data: paginated,
    total,
    page,
    page_size,
  };
}

/**
 * Approve a pending subtask.
 * @param id Subtask ID
 * @returns Success status
 * @endpoint POST /subtasks/:id/approve
 */
export async function approveOperation(id: string): Promise<ApiMutationResponse> {
  await delay(300);

  const subtask = MOCK_OPERATIONS.find((s) => String(s.id) === id);
  if (!subtask) {
    return {
      success: false,
      error: {
        code: "SUBTASK_NOT_FOUND",
        message: `Subtask with ID ${id} not found`,
      },
    };
  }

  if (subtask.review_state !== "PENDING") {
    return {
      success: false,
      error: {
        code: "NOT_PENDING",
        message: "Subtask is not pending review",
      },
    };
  }

  return { success: true };
}

/**
 * Reject a pending subtask.
 * @param id Subtask ID
 * @param reason Rejection reason
 * @returns Success status
 * @endpoint POST /subtasks/:id/reject
 */
export async function rejectOperation(
  id: string,
  reason: string
): Promise<ApiMutationResponse> {
  await delay(300);

  const subtask = MOCK_OPERATIONS.find((s) => String(s.id) === id);
  if (!subtask) {
    return {
      success: false,
      error: {
        code: "SUBTASK_NOT_FOUND",
        message: `Subtask with ID ${id} not found`,
      },
    };
  }

  if (subtask.review_state !== "PENDING") {
    return {
      success: false,
      error: {
        code: "NOT_PENDING",
        message: "Subtask is not pending review",
      },
    };
  }

  if (!reason.trim()) {
    return {
      success: false,
      error: {
        code: "REASON_REQUIRED",
        message: "Rejection reason is required",
      },
    };
  }

  return { success: true };
}

/**
 * Add a new subtask to a task.
 * @param taskId Parent task ID
 * @param name Subtask name
 * @param hint Optional hint text
 * @returns Success status with new subtask ID
 * @endpoint POST /tasks/:id/subtasks
 */
export async function addOperationToTask(
  taskId: string,
  name: string,
  hint?: string
): Promise<ApiMutationResponse> {
  await delay(350);

  const task = MOCK_TASKS.find((t) => t.id === taskId);
  if (!task) {
    return {
      success: false,
      error: {
        code: "TASK_NOT_FOUND",
        message: `Task with ID ${taskId} not found`,
      },
    };
  }

  if (!name.trim()) {
    return {
      success: false,
      error: {
        code: "NAME_REQUIRED",
        message: "Subtask name is required",
      },
    };
  }

  // Check if work type allows new subtasks
  const workType = MOCK_WORK_TYPES.find((w) => w.id === task.work_type_id);
  if (workType && !workType.allow_new_subtasks) {
    return {
      success: false,
      error: {
        code: "NOT_ALLOWED",
        message: "This work type does not allow adding new subtasks",
      },
    };
  }

  const newId = Math.max(...MOCK_OPERATIONS.map((s) => s.id)) + 1;

  return {
    success: true,
    id: String(newId),
  };
}

/**
 * Remove a subtask from a task.
 * @param id Subtask ID
 * @returns Success status
 * @endpoint DELETE /subtasks/:id
 */
export async function removeOperation(id: string): Promise<ApiMutationResponse> {
  await delay(300);

  const subtask = MOCK_OPERATIONS.find((s) => String(s.id) === id);
  if (!subtask) {
    return {
      success: false,
      error: {
        code: "SUBTASK_NOT_FOUND",
        message: `Subtask with ID ${id} not found`,
      },
    };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// TAB COUNTS (для tasks list)
// ═══════════════════════════════════════════════════════════════════

export interface TaskTabCounts {
  all: number;
  active: number;
  on_review: number;
  completed: number;
  rejected: number;
  archived: number;
}

/**
 * Get task counts for each tab.
 * @returns Counts per status tab
 * @endpoint GET /tasks/counts
 */
export async function getTaskTabCounts(): Promise<TaskTabCounts> {
  await delay(200);

  const active = MOCK_TASKS.filter(
    (t) => !t.archived && (t.state === "NEW" || t.state === "IN_PROGRESS" || t.state === "PAUSED")
  ).length;

  const on_review = MOCK_TASKS.filter(
    (t) => !t.archived && t.review_state === "ON_REVIEW"
  ).length;

  const completed = MOCK_TASKS.filter(
    (t) => !t.archived && t.state === "COMPLETED" && t.review_state !== "ON_REVIEW"
  ).length;

  const rejected = MOCK_TASKS.filter(
    (t) => !t.archived && t.review_state === "REJECTED"
  ).length;

  const archived = MOCK_TASKS.filter((t) => t.archived).length;
  const all = MOCK_TASKS.filter((t) => !t.archived).length;

  return { all, active, on_review, completed, rejected, archived };
}

/**
 * Get task filter options for the tasks list (zones, work types, categories, assignees, stores).
 * @returns All available filter options
 * @endpoint GET /tasks/list/filter-options
 */
export async function getTaskListFilterOptions(): Promise<TaskFiltersResponse> {
  await delay(200);

  // Sort: real LAMA сотрудники первыми (см. getTaskFilters).
  const assignees = MOCK_USERS
    .filter((u) => !u.archived && u.type === "STAFF")
    .sort((a, b) => b.id - a.id);

  return {
    zones: MOCK_ZONES.filter((z) => z.approved),
    work_types: MOCK_WORK_TYPES.filter((w) => w.id < 20),
    product_categories: MOCK_PRODUCT_CATEGORIES,
    assignees: assignees.slice(0, 30),
  };
}

// ═══════════════════════════════════════════════════════════════════
// REAL BACKEND wrappers — /tasks/* (svc_tasks)
// ═══════════════════════════════════════════════════════════════════
//
// Сырые обёртки backend endpoints. Возвращают BackendTask/BackendTaskListData
// как есть. Lossy dispatch (admin → backend с потерей admin-полей) НЕ делаем.
// Consumers сами адаптируют BackendTask → admin Task через адаптер при свапе.
//
// Backend-контракт см. wfm-develop mobile/.../svc_tasks/app/api/tasks.py.

import { apiUrl as _tApiUrl } from "./_config";
import {
  backendGet as _tGet,
  backendPost as _tPost,
  backendPatch as _tPatch,
} from "./_client";
import type {
  BackendTask,
  BackendTaskListData,
  BackendTaskCreate,
  BackendTaskUpdate,
  BackendTaskState,
  BackendTaskReviewState,
  BackendTaskListFiltersData,
  BackendTaskListUsersData,
  BackendTaskEventListData,
} from "./_backend-types";

interface TaskListBackendParams {
  assignment_id: number;
  state?: BackendTaskState;
  review_state?: BackendTaskReviewState;
  assignee_ids?: number[];
  zone_ids?: number[];
  work_type_ids?: number[];
}

function _buildQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/** GET /tasks/list — задачи магазина (только MANAGER). */
export async function getTasksFromBackend(
  params: TaskListBackendParams,
): Promise<BackendTaskListData> {
  return _tGet<BackendTaskListData>(
    _tApiUrl("tasks", `/list${_buildQuery({ ...params } as unknown as Record<string, unknown>)}`),
  );
}

/** GET /tasks/list/v2 — то же что list, но zone+work_type фильтры применяются как AND. */
export async function getTasksV2FromBackend(
  params: TaskListBackendParams,
): Promise<BackendTaskListData> {
  return _tGet<BackendTaskListData>(
    _tApiUrl("tasks", `/list/v2${_buildQuery({ ...params } as unknown as Record<string, unknown>)}`),
  );
}

/** GET /tasks/list/filters — зоны+типы работ для фильтра задач сегодня. */
export async function getTaskFiltersFromBackend(
  assignmentId: number,
): Promise<BackendTaskListFiltersData> {
  return _tGet<BackendTaskListFiltersData>(
    _tApiUrl("tasks", `/list/filters?assignment_id=${assignmentId}`),
  );
}

/** GET /tasks/list/users — сотрудники с плановой сменой сегодня. */
export async function getTaskListUsersFromBackend(
  assignmentId: number,
): Promise<BackendTaskListUsersData> {
  return _tGet<BackendTaskListUsersData>(
    _tApiUrl("tasks", `/list/users?assignment_id=${assignmentId}`),
  );
}

/** GET /tasks/my — мои задачи (для WORKER) */
export async function getMyTasksFromBackend(
  assignmentId: number,
  state?: BackendTaskState,
): Promise<BackendTaskListData> {
  const q = _buildQuery({ assignment_id: assignmentId, state });
  return _tGet<BackendTaskListData>(_tApiUrl("tasks", `/my${q}`));
}

/** GET /tasks/{id} — детали задачи + history_brief + operations. */
export async function getTaskByIdFromBackend(id: string): Promise<BackendTask> {
  return _tGet<BackendTask>(_tApiUrl("tasks", `/${id}`));
}

/** POST /tasks — создание задачи (только MANAGER). */
export async function createTaskOnBackend(
  data: BackendTaskCreate,
): Promise<BackendTask> {
  return _tPost<BackendTask>(_tApiUrl("tasks", `/`), data);
}

/** PATCH /tasks/{id} — частичное обновление (только MANAGER). */
export async function updateTaskOnBackend(
  id: string,
  data: BackendTaskUpdate,
): Promise<BackendTask> {
  return _tPatch<BackendTask>(_tApiUrl("tasks", `/${id}`), data);
}

// ── State transitions ────────────────────────────────────────────────

/** POST /tasks/{id}/start — NEW → IN_PROGRESS. */
export async function startTaskOnBackend(id: string): Promise<BackendTask> {
  return _tPost<BackendTask>(_tApiUrl("tasks", `/${id}/start`));
}

/** POST /tasks/{id}/pause — IN_PROGRESS → PAUSED. */
export async function pauseTaskOnBackend(id: string): Promise<BackendTask> {
  return _tPost<BackendTask>(_tApiUrl("tasks", `/${id}/pause`));
}

/** POST /tasks/{id}/resume — PAUSED → IN_PROGRESS. */
export async function resumeTaskOnBackend(id: string): Promise<BackendTask> {
  return _tPost<BackendTask>(_tApiUrl("tasks", `/${id}/resume`));
}

interface CompleteTaskArgs {
  /** Текстовый комментарий работника (опционально). */
  reportText?: string;
  /** Файл фото (jpeg/png/webp/heic). Обязателен если task.requires_photo=true. */
  reportImage?: File | Blob;
  /** id операций отмеченных работником (превратится в JSON-массив для backend). */
  operationIds?: number[];
  /** Названия новых операций (только если work_type.allow_new_operations=true). */
  newOperations?: string[];
}

/**
 * POST /tasks/{id}/complete — multipart/form-data.
 * IN_PROGRESS|PAUSED → COMPLETED. acceptance_policy решает review_state.
 */
export async function completeTaskOnBackend(
  id: string,
  args: CompleteTaskArgs = {},
): Promise<BackendTask> {
  const fd = new FormData();
  if (args.reportText !== undefined) fd.append("report_text", args.reportText);
  if (args.reportImage) fd.append("report_image", args.reportImage);
  if (args.operationIds && args.operationIds.length > 0) {
    fd.append("operation_ids", JSON.stringify(args.operationIds));
  }
  if (args.newOperations && args.newOperations.length > 0) {
    fd.append("new_operations", JSON.stringify(args.newOperations));
  }
  return _tPost<BackendTask>(_tApiUrl("tasks", `/${id}/complete`), fd);
}

// ── Review (только MANAGER) ──────────────────────────────────────────

/** POST /tasks/{id}/approve — review_state → ACCEPTED. */
export async function approveTaskOnBackend(id: string): Promise<BackendTask> {
  return _tPost<BackendTask>(_tApiUrl("tasks", `/${id}/approve`));
}

/** POST /tasks/{id}/reject — review_state → REJECTED, task → PAUSED, причина обязательна. */
export async function rejectTaskOnBackend(
  id: string,
  reason: string,
): Promise<BackendTask> {
  return _tPost<BackendTask>(_tApiUrl("tasks", `/${id}/reject`), { reason });
}

/** GET /tasks/{id}/events — полная история state-машины задачи. */
export async function getTaskEventsFromBackend(
  id: string,
): Promise<BackendTaskEventListData> {
  return _tGet<BackendTaskEventListData>(_tApiUrl("tasks", `/${id}/events`));
}

// ─── Deprecated aliases для обратной совместимости (Subtask → Operation rename) ───
// Удалить когда все consumers мигрируют на новые имена.

/** @deprecated Используй getPendingOperations. */
export const getSubtasksPending = getPendingOperations;
/** @deprecated Используй approveOperation. */
export const approveSubtask = approveOperation;
/** @deprecated Используй rejectOperation. */
export const rejectSubtask = rejectOperation;
/** @deprecated Используй addOperationToTask. */
export const addSubtaskToTask = addOperationToTask;
/** @deprecated Используй removeOperation. */
export const removeSubtask = removeOperation;
/** @deprecated Используй OperationWithTaskTitle. */
export type SubtaskWithTaskTitle = OperationWithTaskTitle;
