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
  Subtask,
  Hint,
  Zone,
  WorkType,
  ProductCategory,
  User,
  ArchiveReason,
  Permission,
} from "@/lib/types";
import { MOCK_TASKS } from "@/lib/mock-data/tasks";
import { MOCK_SUBTASKS } from "@/lib/mock-data/subtasks";
import { MOCK_HINTS } from "@/lib/mock-data/hints";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_PRODUCT_CATEGORIES } from "@/lib/mock-data/product-categories";
import { MOCK_USERS } from "@/lib/mock-data/users";

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
  subtasks: Subtask[];
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

/** Subtask with parent task title for pending lists */
export interface SubtaskWithTaskTitle extends Subtask {
  task_title: string;
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
  const subtasks = MOCK_SUBTASKS.filter((s) => s.task_id === id);

  // Get hints for this task's work_type and zone
  const hints = MOCK_HINTS.filter(
    (h) => h.work_type_id === task.work_type_id && h.zone_id === task.zone_id
  );

  // Generate mock history based on task state
  const history: TaskEvent[] = [];
  let eventId = 1;

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
  // Using assignmentId to log — will be used for scoping when connected to backend
  console.log(`[v0] Getting filters for assignment ${assignmentId}`);
  const assignees = MOCK_USERS.filter((u) => !u.archived && u.type === "STAFF");

  return {
    data: {
      zones: MOCK_ZONES.filter((z) => z.approved),
      work_types: MOCK_WORK_TYPES.filter((w) => w.id < 20), // Retail only
      product_categories: MOCK_PRODUCT_CATEGORIES,
      assignees: assignees.slice(0, 20), // Limit for demo
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
  console.log(`[v0] Created task ${newId}:`, data);

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

  console.log(`[v0] Updated task ${id}:`, data);
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

  console.log(`[v0] Archived task ${id} with reason: ${reason}`, comment);
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

  console.log(`[v0] Restored task ${id} from archive`);
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

  console.log(`[v0] Bulk archived ${taskIds.length} tasks with reason: ${reason}`);
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
    console.log(`[v0] Transferred task ${id} to permission: ${nextPermission}`);
  } else {
    console.log(`[v0] Unassigned task ${id}`);
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

  console.log(`[v0] Approved task ${id}`, comment);
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

  console.log(`[v0] Rejected task ${id}: ${reason}`);
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
 * Get pending subtasks (awaiting moderation) for a store.
 * @param params Filter parameters
 * @returns Paginated list of pending subtasks with task titles
 * @endpoint GET /tasks/subtasks/pending
 */
export async function getSubtasksPending(
  params: ApiListParams & { store_id?: number } = {}
): Promise<ApiListResponse<SubtaskWithTaskTitle>> {
  await delay(300);

  const { store_id, page = 1, page_size = 20 } = params;

  // Get pending subtasks
  let pending = MOCK_SUBTASKS.filter((s) => s.review_state === "PENDING");

  // Filter by store if provided
  if (store_id) {
    const taskIdsInStore = MOCK_TASKS
      .filter((t) => t.store_id === store_id)
      .map((t) => t.id);
    pending = pending.filter((s) => taskIdsInStore.includes(s.task_id));
  }

  // Paginate
  const total = pending.length;
  const start = (page - 1) * page_size;
  const paginated = pending.slice(start, start + page_size);

  // Enrich with task title
  const enriched: SubtaskWithTaskTitle[] = paginated.map((subtask) => {
    const task = MOCK_TASKS.find((t) => t.id === subtask.task_id);
    return {
      ...subtask,
      task_title: task?.title ?? "Unknown Task",
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
 * Approve a pending subtask.
 * @param id Subtask ID
 * @returns Success status
 * @endpoint POST /subtasks/:id/approve
 */
export async function approveSubtask(id: string): Promise<ApiMutationResponse> {
  await delay(300);

  const subtask = MOCK_SUBTASKS.find((s) => String(s.id) === id);
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

  console.log(`[v0] Approved subtask ${id}`);
  return { success: true };
}

/**
 * Reject a pending subtask.
 * @param id Subtask ID
 * @param reason Rejection reason
 * @returns Success status
 * @endpoint POST /subtasks/:id/reject
 */
export async function rejectSubtask(
  id: string,
  reason: string
): Promise<ApiMutationResponse> {
  await delay(300);

  const subtask = MOCK_SUBTASKS.find((s) => String(s.id) === id);
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

  console.log(`[v0] Rejected subtask ${id}: ${reason}`);
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
export async function addSubtaskToTask(
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

  const newId = Math.max(...MOCK_SUBTASKS.map((s) => s.id)) + 1;
  console.log(`[v0] Added subtask ${newId} to task ${taskId}:`, name, hint);

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
export async function removeSubtask(id: string): Promise<ApiMutationResponse> {
  await delay(300);

  const subtask = MOCK_SUBTASKS.find((s) => String(s.id) === id);
  if (!subtask) {
    return {
      success: false,
      error: {
        code: "SUBTASK_NOT_FOUND",
        message: `Subtask with ID ${id} not found`,
      },
    };
  }

  console.log(`[v0] Removed subtask ${id}`);
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

  const assignees = MOCK_USERS.filter((u) => !u.archived && u.type === "STAFF");

  return {
    zones: MOCK_ZONES.filter((z) => z.approved),
    work_types: MOCK_WORK_TYPES.filter((w) => w.id < 20),
    product_categories: MOCK_PRODUCT_CATEGORIES,
    assignees: assignees.slice(0, 30),
  };
}
