/**
 * Users API - User management, assignments, and permissions.
 * Single integration point for user CRUD operations.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  User,
  Assignment,
  WorkerPermission,
  Permission,
  FunctionalRole,
  EmployeeType,
  FreelancerStatus,
  Shift,
  PaymentMode,
} from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock-data";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";
import { MOCK_PERMISSIONS } from "@/lib/mock-data/permissions";
import { MOCK_FUNCTIONAL_ROLES } from "@/lib/mock-data/functional-roles";
import { MOCK_SHIFTS } from "@/lib/mock-data/shifts";
import { MOCK_FREELANCE_AGENTS } from "@/lib/mock-data/freelance-agents";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

/** Сегодняшняя дата в моках — синхронизируем с MOCK_SHIFTS / MOCK_TASKS. */
const TODAY = "2026-05-01";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms: number = 300) => new Promise((r) => setTimeout(r, ms));

/** User with embedded assignment, permissions, и текущая смена (если есть). */
export interface UserWithAssignment extends User {
  assignment: Assignment;
  permissions: Permission[];
  /** Назначенная функциональная роль (через MOCK_FUNCTIONAL_ROLES). */
  functional_role?: FunctionalRole;
  /** Текущая смена сегодня (если есть, для отображения ShiftStateBadge + времени). */
  current_shift?: Shift | null;
  /** Кол-во загруженных документов внештатника (для FREELANCE-индикатора). 0 = нет документов. */
  freelance_documents_count?: number;
  /** Имя агента (для колонки «Агент» в employees-list). null = без агента. */
  agent_name?: string | null;
}

/** Statistics for an employee (tasks last 30 days). */
export interface UserStats {
  tasks_total: number;
  tasks_diff_pct: number;
  tasks_accepted: number;
  tasks_rejected: number;
  paused_now: number;
  avg_completion_min: number;
  avg_completion_diff_min: number;
}

/** Functional role + scope (read-only on detail screen unless HR_MANAGER/NETWORK_OPS). */
export interface UserFunctionalScope {
  functional_role: FunctionalRole;
  scope_type: "STORE" | "STORE_LIST" | "REGION" | "ORGANIZATION";
  scope_ids: Array<number | string>;
  scope_store_names?: string[];
}

/** Freelance document record. */
export interface FreelanceDocument {
  type: "PASSPORT" | "INN" | "SNILS" | "CONTRACT";
  uploaded_at: string | null;
  file_name: string | null;
  file_url: string | null;
}

/** User with full assignments, permissions history, stats, and extended fields. */
export interface UserDetail extends User {
  assignments: Assignment[];
  permissions: WorkerPermission[];
  functional_scope?: UserFunctionalScope;
  current_shift?: Shift | null;
  stats?: UserStats;
  last_active_at?: string;
  freelance_documents?: FreelanceDocument[];
  /** Resolved agent name (FREELANCE only, null if no agent). */
  agent_name?: string | null;
  /** Organization payment mode (FREELANCE only). */
  payment_mode?: PaymentMode;
}

/**
 * User filter parameters.
 * Поддерживает multi-фильтры (store_ids, position_ids, permissions) для employees-list,
 * и legacy-single (store_id, permission) для обратной совместимости с другими экранами.
 */
export interface UserListParams extends ApiListParams {
  role?: FunctionalRole;
  /** Single store filter (legacy). Для multi используй store_ids. */
  store_id?: number;
  /** Multi-store filter — пользователь попадает в выборку если хоть в одном из. */
  store_ids?: number[];
  /** Single position filter. */
  position_id?: number;
  /** Multi-position filter. */
  position_ids?: number[];
  /** Single permission filter (legacy). */
  permission?: Permission;
  /** Multi-permission filter — пользователь попадает если имеет хоть одну из. */
  permissions?: Permission[];
  /** Тип занятости: STAFF | FREELANCE. */
  employment_type?: EmployeeType;
  /** Статус внештатника. Активен только при employment_type=FREELANCE. */
  freelancer_status?: FreelancerStatus;
  /** Фильтр по agent_id. Scope=organization. Скрыт при payment_mode=CLIENT_DIRECT. */
  agent_ids?: string[];
  /**
   * Источник создания: MANUAL | EXTERNAL_SYNC.
   * Скрыт при organization.external_hr_enabled=false.
   */
  source?: "MANUAL" | "EXTERNAL_SYNC";
  /** Архивированные. По умолчанию false (только активные). */
  archived?: boolean;
}

/** Способ отправки приглашения новому сотруднику (для STAFF). */
export type InviteMethod = "EMAIL" | "TELEGRAM" | "MAX" | "WHATSAPP" | "NONE";

/** Канал отправки оферты внештатнику (для FREELANCE). По умолчанию = preferred auth канал организации. */
export type OfertaChannel = "SMS" | "TELEGRAM" | "EMAIL";

/** User create payload — используется wizard'ом /employees/new. */
export interface UserCreateData extends Partial<User> {
  /** Должность (формальная). Обязательно. */
  position_id: number;
  /** Магазин текущего назначения. Обязательно. */
  store_id: number;
  /** Грейд внутри должности (1-6). По умолчанию 1. */
  rank?: number;
  /** Дата рождения (опционально). ISO. */
  date_of_birth?: string;
  /** Дата найма. По умолчанию сегодня. */
  hired_at?: string;
  /** Назначаемые привилегии при создании. Игнорируется для управляющих. */
  permissions?: Permission[];
  /** Способ отправки приглашения (для STAFF). */
  invite_method?: InviteMethod;
  /** Текст сообщения (по шаблону, заменяемый). */
  invite_message?: string;
  /** Отправить копию приглашения управляющему магазина. */
  notify_manager?: boolean;
  /** ID агента-привлёкшего (для FREELANCE + payment_mode=NOMINAL_ACCOUNT). null = без агента. */
  agent_id?: string | null;
  /** Канал отправки оферты (для FREELANCE). */
  oferta_channel?: OfertaChannel;
  /** Legacy (deprecated): используй invite_method. */
  send_invite?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ════════════════════════════════════════════════════════════��══════

/**
 * Get paginated list of users with filtering.
 * @param params Filter and pagination parameters
 * @returns Paginated list of users with assignments and permissions
 * @endpoint GET /users/list
 */
export async function getUsers(
  params: UserListParams = {}
): Promise<ApiListResponse<UserWithAssignment>> {
  await delay(350);

  const {
    search,
    role,
    store_id,
    store_ids,
    position_id,
    position_ids,
    permission,
    permissions,
    employment_type,
    freelancer_status,
    agent_ids,
    source,
    archived = false,
    page = 1,
    page_size = 20,
    sort_by = "id",
    sort_dir = "asc",
  } = params;

  let filtered = [...MOCK_USERS];

  // Filter by archived status
  filtered = filtered.filter((u) => u.archived === archived);

  // Filter by role (using functional roles)
  if (role) {
    const roleUserIds = MOCK_FUNCTIONAL_ROLES
      .filter((r) => r.functional_role === role)
      .map((r) => r.user_id);
    filtered = filtered.filter((u) => roleUserIds.includes(u.id));
  }

  // Filter by store(s) — multi takes precedence over single
  const effectiveStoreIds = store_ids && store_ids.length > 0
    ? store_ids
    : (store_id ? [store_id] : null);
  if (effectiveStoreIds) {
    const storeUserIds = new Set(
      MOCK_ASSIGNMENTS
        .filter((a) => a.active && effectiveStoreIds.includes(a.store_id))
        .map((a) => a.user_id),
    );
    filtered = filtered.filter((u) => storeUserIds.has(u.id));
  }

  // Filter by position(s)
  const effectivePositionIds = position_ids && position_ids.length > 0
    ? position_ids
    : (position_id ? [position_id] : null);
  if (effectivePositionIds) {
    const positionUserIds = new Set(
      MOCK_ASSIGNMENTS
        .filter((a) => a.active && effectivePositionIds.includes(a.position_id))
        .map((a) => a.user_id),
    );
    filtered = filtered.filter((u) => positionUserIds.has(u.id));
  }

  // Filter by permission(s) — user matches if has ANY of requested permissions
  const effectivePermissions = permissions && permissions.length > 0
    ? permissions
    : (permission ? [permission] : null);
  if (effectivePermissions) {
    const permUserIds = new Set(
      MOCK_PERMISSIONS
        .filter((p) => !p.revoked_at && effectivePermissions.includes(p.permission))
        .map((p) => p.user_id),
    );
    filtered = filtered.filter((u) => permUserIds.has(u.id));
  }

  // Filter by employment type
  if (employment_type) {
    filtered = filtered.filter((u) => u.type === employment_type);
  }

  // Filter by freelancer status (only relevant for FREELANCE users)
  if (freelancer_status) {
    filtered = filtered.filter((u) => u.freelancer_status === freelancer_status);
  }

  // Filter by agent_ids (multi-select)
  if (agent_ids && agent_ids.length > 0) {
    filtered = filtered.filter(
      (u) => u.agent_id != null && agent_ids.includes(u.agent_id)
    );
  }

  // Filter by creation source
  if (source) {
    filtered = filtered.filter((u) => u.source === source);
  }

  // Search by name or phone
  if (search) {
    const lowerSearch = search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.first_name.toLowerCase().includes(lowerSearch) ||
        u.last_name.toLowerCase().includes(lowerSearch) ||
        (u.middle_name?.toLowerCase().includes(lowerSearch) ?? false) ||
        u.phone.includes(search),
    );
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sort_by as keyof User];
    const bVal = b[sort_by as keyof User];
    if (aVal === undefined) return 1;
    if (bVal === undefined) return -1;
    const cmp = String(aVal).localeCompare(String(bVal));
    return sort_dir === "asc" ? cmp : -cmp;
  });

  // Paginate
  const total = filtered.length;
  const start = (page - 1) * page_size;
  const paginated = filtered.slice(start, start + page_size);

  // Enrich with assignment, permissions, functional role, current shift
  const enriched: UserWithAssignment[] = paginated.map((user) => {
    const assignment = MOCK_ASSIGNMENTS.find(
      (a) => a.user_id === user.id && a.active
    ) ?? MOCK_ASSIGNMENTS.find((a) => a.user_id === user.id)!;

    const userPerms = MOCK_PERMISSIONS
      .filter((p) => p.user_id === user.id && !p.revoked_at)
      .map((p) => p.permission);

    const funcRole = MOCK_FUNCTIONAL_ROLES.find(
      (r) => r.user_id === user.id,
    )?.functional_role;

    // Сегодняшняя смена пользователя — берём первую (план или факт) на TODAY.
    const todayShift = MOCK_SHIFTS.find(
      (s) => s.user_id === user.id && s.shift_date === TODAY,
    ) ?? null;

    // Заглушка для freelance-документов — на M0 не считаем реально.
    const docsCount = user.type === "FREELANCE" ? 0 : undefined;

    // Resolve agent name for FREELANCE users
    const agentName =
      user.type === "FREELANCE" && user.agent_id
        ? (MOCK_FREELANCE_AGENTS.find((a) => a.id === user.agent_id)?.name ?? null)
        : null;

    return {
      ...user,
      assignment,
      permissions: userPerms,
      functional_role: funcRole,
      current_shift: todayShift,
      freelance_documents_count: docsCount,
      agent_name: agentName,
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
 * Get single user by ID with full assignments, permissions history, stats, and functional scope.
 * @param id User ID
 * @returns User with all extended fields
 * @endpoint GET /users/:id
 */
export async function getUserById(
  id: number
): Promise<ApiResponse<UserDetail>> {
  await delay(300);

  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) {
    throw new Error(`User with ID ${id} not found`);
  }

  const assignments = MOCK_ASSIGNMENTS.filter((a) => a.user_id === id);
  const permissions = MOCK_PERMISSIONS.filter((p) => p.user_id === id);

  // Resolve functional scope
  const roleAssignment = MOCK_FUNCTIONAL_ROLES.find((r) => r.user_id === id);
  let functional_scope: UserFunctionalScope | undefined;
  if (roleAssignment) {
    functional_scope = {
      functional_role: roleAssignment.functional_role,
      scope_type: roleAssignment.scope_type,
      scope_ids: roleAssignment.scope_ids,
    };
  }

  // Current shift
  const current_shift = MOCK_SHIFTS.find(
    (s) => s.user_id === id && s.shift_date === TODAY,
  ) ?? null;

  // Mock realistic stats for demo user 101, generic fallback for others
  const stats: UserStats =
    id === 101
      ? {
          tasks_total: 87,
          tasks_diff_pct: 12,
          tasks_accepted: 79,
          tasks_rejected: 5,
          paused_now: 1,
          avg_completion_min: 42,
          avg_completion_diff_min: -3,
        }
      : {
          tasks_total: Math.floor(20 + Math.random() * 60),
          tasks_diff_pct: Math.floor(-10 + Math.random() * 25),
          tasks_accepted: Math.floor(15 + Math.random() * 50),
          tasks_rejected: Math.floor(Math.random() * 8),
          paused_now: Math.floor(Math.random() * 3),
          avg_completion_min: Math.floor(30 + Math.random() * 40),
          avg_completion_diff_min: Math.floor(-8 + Math.random() * 16),
        };

  // Freelance documents (only for FREELANCE type)
  const freelance_documents: FreelanceDocument[] | undefined =
    user.type === "FREELANCE"
      ? [
          { type: "PASSPORT", uploaded_at: null, file_name: null, file_url: null },
          { type: "INN", uploaded_at: null, file_name: null, file_url: null },
          { type: "SNILS", uploaded_at: null, file_name: null, file_url: null },
          { type: "CONTRACT", uploaded_at: null, file_name: null, file_url: null },
        ]
      : undefined;

  // Resolve agent name for FREELANCE users
  const agent_name =
    user.type === "FREELANCE" && user.agent_id
      ? (MOCK_FREELANCE_AGENTS.find((a) => a.id === user.agent_id)?.name ?? null)
      : null;

  // Resolve payment_mode from first organization (SPAR demo)
  const payment_mode: PaymentMode | undefined =
    user.type === "FREELANCE"
      ? (MOCK_ORGANIZATIONS[0]?.payment_mode ?? "NOMINAL_ACCOUNT")
      : undefined;

  return {
    data: {
      ...user,
      assignments,
      permissions,
      functional_scope,
      current_shift,
      stats,
      last_active_at: id === 101 ? "2026-05-01T08:22:00Z" : undefined,
      freelance_documents,
      agent_name,
      payment_mode,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// CREATE / UPDATE / ARCHIVE
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new user with initial assignment.
 * @param data User data with position and store
 * @returns Success status with new user ID
 * @endpoint POST /users
 */
export async function createUser(
  data: UserCreateData
): Promise<ApiMutationResponse> {
  await delay(400);

  const { phone, first_name, last_name, position_id, store_id, send_invite } = data;

  if (!phone || !first_name || !last_name) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Phone, first name, and last name are required",
      },
    };
  }

  // Check for duplicate phone
  const existingUser = MOCK_USERS.find(
    (u) => u.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
  );
  if (existingUser) {
    return {
      success: false,
      error: {
        code: "DUPLICATE_PHONE",
        message: "User with this phone number already exists",
      },
    };
  }

  const newId = Math.max(...MOCK_USERS.map((u) => u.id)) + 1;
  console.log(
    `[v0] Created user ${newId}: ${first_name} ${last_name}, position ${position_id}, store ${store_id}, invite: ${send_invite}`
  );

  return {
    success: true,
    id: String(newId),
  };
}

/**
 * Update user data.
 * @param id User ID
 * @param data Partial user data to update
 * @returns Success status
 * @endpoint PATCH /users/:id
 */
export async function updateUser(
  id: number,
  data: Partial<User>
): Promise<ApiMutationResponse> {
  await delay(350);

  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) {
    return {
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: `User with ID ${id} not found`,
      },
    };
  }

  if (user.archived) {
    return {
      success: false,
      error: {
        code: "USER_ARCHIVED",
        message: "Cannot update archived user",
      },
    };
  }

  console.log(`[v0] Updated user ${id}:`, data);
  return { success: true };
}

/**
 * Archive (soft-delete) a user.
 * @param id User ID
 * @returns Success status
 * @endpoint DELETE /users/:id
 */
export async function archiveUser(id: number): Promise<ApiMutationResponse> {
  await delay(300);

  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) {
    return {
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: `User with ID ${id} not found`,
      },
    };
  }

  if (user.archived) {
    return {
      success: false,
      error: {
        code: "ALREADY_ARCHIVED",
        message: "User is already archived",
      },
    };
  }

  console.log(`[v0] Archived user ${id}`);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Update user permissions (replaces all permissions with new list).
 * @param id User ID
 * @param permissions Full array of permissions to set
 * @returns Success status
 * @endpoint PATCH /users/:id/permissions
 */
export async function updateUserPermissions(
  id: number,
  permissions: Permission[]
): Promise<ApiMutationResponse> {
  await delay(350);

  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) {
    return {
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: `User with ID ${id} not found`,
      },
    };
  }

  // Validate permission values
  const validPermissions: Permission[] = [
    "CASHIER",
    "SALES_FLOOR",
    "SELF_CHECKOUT",
    "WAREHOUSE",
    "PRODUCTION_LINE",
  ];
  const invalid = permissions.filter((p) => !validPermissions.includes(p));
  if (invalid.length > 0) {
    return {
      success: false,
      error: {
        code: "INVALID_PERMISSION",
        message: `Invalid permissions: ${invalid.join(", ")}`,
      },
    };
  }

  console.log(`[v0] Updated permissions for user ${id}:`, permissions);
  return { success: true };
}

/**
 * Bulk assign permission to multiple users.
 * @param userIds Array of user IDs
 * @param permission Permission to assign
 * @returns Success status
 * @endpoint POST /users/bulk-permissions
 */
export async function bulkAssignPermission(
  userIds: number[],
  permission: Permission
): Promise<ApiMutationResponse> {
  await delay(400);

  if (userIds.length === 0) {
    return {
      success: false,
      error: {
        code: "EMPTY_LIST",
        message: "No user IDs provided",
      },
    };
  }

  // Check all users exist
  const missingIds = userIds.filter((id) => !MOCK_USERS.find((u) => u.id === id));
  if (missingIds.length > 0) {
    return {
      success: false,
      error: {
        code: "USERS_NOT_FOUND",
        message: `Users not found: ${missingIds.join(", ")}`,
      },
    };
  }

  console.log(`[v0] Bulk assigned ${permission} to users:`, userIds);
  return { success: true };
}

/**
 * Bulk revoke permission from multiple users.
 * @param userIds Array of user IDs
 * @param permission Permission to revoke
 * @returns Success status
 * @endpoint POST /users/bulk-permissions (with revoke flag)
 */
export async function bulkRevokePermission(
  userIds: number[],
  permission: Permission
): Promise<ApiMutationResponse> {
  await delay(400);

  if (userIds.length === 0) {
    return {
      success: false,
      error: {
        code: "EMPTY_LIST",
        message: "No user IDs provided",
      },
    };
  }

  // Check all users exist
  const missingIds = userIds.filter((id) => !MOCK_USERS.find((u) => u.id === id));
  if (missingIds.length > 0) {
    return {
      success: false,
      error: {
        code: "USERS_NOT_FOUND",
        message: `Users not found: ${missingIds.join(", ")}`,
      },
    };
  }

  console.log(`[v0] Bulk revoked ${permission} from users:`, userIds);
  return { success: true };
}

/**
 * Bulk update functional role for multiple users.
 * Например: «10 человек назначить ProdUniver», «5 человек сделать Deputy».
 * Заменяет все текущие active functional roles этих пользователей.
 * @param userIds Array of user IDs
 * @param role New functional role to assign
 * @endpoint POST /users/bulk-role
 */
export async function bulkUpdateRole(
  userIds: number[],
  role: FunctionalRole
): Promise<ApiMutationResponse> {
  await delay(400);

  if (userIds.length === 0) {
    return {
      success: false,
      error: { code: "EMPTY_LIST", message: "No user IDs provided" },
    };
  }

  const missingIds = userIds.filter((id) => !MOCK_USERS.find((u) => u.id === id));
  if (missingIds.length > 0) {
    return {
      success: false,
      error: {
        code: "USERS_NOT_FOUND",
        message: `Users not found: ${missingIds.join(", ")}`,
      },
    };
  }

  console.log(`[v0] Bulk role update ${role} for users:`, userIds);
  return { success: true };
}

/**
 * Bulk transfer multiple users to another store.
 * Создаёт новый Assignment в target-магазине, archive'ит старый.
 * @param userIds Array of user IDs
 * @param storeId Target store ID
 * @endpoint POST /users/bulk-store
 */
export async function bulkUpdateStore(
  userIds: number[],
  storeId: number
): Promise<ApiMutationResponse> {
  await delay(450);

  if (userIds.length === 0) {
    return {
      success: false,
      error: { code: "EMPTY_LIST", message: "No user IDs provided" },
    };
  }

  const missingIds = userIds.filter((id) => !MOCK_USERS.find((u) => u.id === id));
  if (missingIds.length > 0) {
    return {
      success: false,
      error: {
        code: "USERS_NOT_FOUND",
        message: `Users not found: ${missingIds.join(", ")}`,
      },
    };
  }

  console.log(`[v0] Bulk transferred users ${userIds.join(",")} to store ${storeId}`);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// PROFILE — MY ASSIGNMENTS (chat 35)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all assignments for the current user (active + archived).
 * Used by profile settings / assignments section.
 * @param userId Current user's ID
 * @returns List of assignments ordered active-first
 * @endpoint GET /users/me/assignments
 */
export async function getMyAssignments(
  userId: number,
): Promise<ApiResponse<Assignment[]>> {
  await delay(250);

  const assignments = MOCK_ASSIGNMENTS.filter((a) => a.user_id === userId);
  // Active first
  assignments.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));

  return { data: assignments };
}

// ═══════════════════════════════════════════════════════════════════
// PERMISSIONS COVERAGE (для permissions matrix stats row)
// ═══════════════════════════════════════════════════════════════════

/** Разбивка по одной привилегии для stats row на permissions matrix. */
export interface PermissionCoverageRow {
  permission: Permission;
  /** Кол-во работников с этой привилегией (granted, не revoked). */
  granted_count: number;
  /** Кол-во подходящих работников (роль worker, не архивных). Знаменатель. */
  eligible_count: number;
  /** Покрытие в процентах (0-100). */
  coverage_pct: number;
  /** Тренд за 30 дней (sparkline) — N точек, последняя = текущее. */
  trend_30d: number[];
}

/**
 * Get coverage statistics for all permissions in scope.
 * Использует MOCK_USERS + MOCK_PERMISSIONS, фильтр по архивным/manager.
 *
 * @param storeId опционально — ограничить scope (для STORE_DIRECTOR / SUPERVISOR)
 * @returns coverage row per permission (5 строк: CASHIER, SALES_FLOOR, SELF_CHECKOUT, WAREHOUSE, PRODUCTION_LINE)
 * @endpoint GET /users/permissions/coverage?store_id=
 * @roles STORE_DIRECTOR (свой магазин), SUPERVISOR, NETWORK_OPS
 */
export async function getPermissionsCoverage(
  storeId?: number,
): Promise<ApiResponse<PermissionCoverageRow[]>> {
  await delay(250);

  const ALL: Permission[] = ["CASHIER", "SALES_FLOOR", "SELF_CHECKOUT", "WAREHOUSE", "PRODUCTION_LINE"];

  // Eligible: не архивный + не manager. Manager определяем через position role_id=2 — но у нас нет
  // позиции в User. Используем наличие активного assignment + проверка через роль из functional-roles.
  const managerUserIds = new Set(
    MOCK_FUNCTIONAL_ROLES
      .filter((r) => r.functional_role !== "WORKER")
      .map((r) => r.user_id),
  );

  let eligibleUsers = MOCK_USERS.filter((u) => !u.archived && !managerUserIds.has(u.id));

  if (storeId) {
    const storeUserIds = new Set(
      MOCK_ASSIGNMENTS
        .filter((a) => a.active && a.store_id === storeId)
        .map((a) => a.user_id),
    );
    eligibleUsers = eligibleUsers.filter((u) => storeUserIds.has(u.id));
  }

  const eligibleIds = new Set(eligibleUsers.map((u) => u.id));
  const eligible_count = eligibleUsers.length;

  const rows: PermissionCoverageRow[] = ALL.map((perm) => {
    const granted_count = MOCK_PERMISSIONS.filter(
      (p) => p.permission === perm && !p.revoked_at && eligibleIds.has(p.user_id),
    ).length;

    const coverage_pct = eligible_count === 0 ? 0 : Math.round((granted_count / eligible_count) * 100);

    // Mock 30-day trend — детерминированный по permission (чтобы график не прыгал)
    const seed = perm.length;
    const trend_30d = Array.from({ length: 30 }, (_, i) => {
      const noise = ((i + seed) * 7) % 11 - 5; // -5..+5
      return Math.max(0, Math.min(100, coverage_pct - 10 + noise + Math.floor(i / 3)));
    });

    return { permission: perm, granted_count, eligible_count, coverage_pct, trend_30d };
  });

  return { data: rows };
}

// ═══════════════════════════════════════════════════════════════════
// REAL BACKEND: GET /users/me
// ═══════════════════════════════════════════════════════════════════

import { apiUrl } from "./_config";
import { backendGet } from "./_client";
import type { BackendUserMe } from "./_backend-types";

/**
 * Получить полную инфу о текущем пользователе из real backend.
 * Backend склеивает локальные + SSO + LAMA данные.
 *
 * Использует JWT из _auth-token.ts. Падает с BackendApiError если токен
 * отсутствует/невалидный (UNAUTHORIZED).
 *
 * @endpoint GET /users/me
 */
export async function getCurrentUserMe(): Promise<BackendUserMe> {
  return backendGet<BackendUserMe>(apiUrl("users", "/me"));
}
