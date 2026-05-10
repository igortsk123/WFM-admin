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
  ObjectFormat,
} from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock-data";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";
import { MOCK_PERMISSIONS } from "@/lib/mock-data/permissions";
import { MOCK_FUNCTIONAL_ROLES } from "@/lib/mock-data/functional-roles";
import { MOCK_SHIFTS } from "@/lib/mock-data/shifts";
import { MOCK_FREELANCE_AGENTS } from "@/lib/mock-data/freelance-agents";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";
import { LAMA_EMPLOYEE_WORK_TYPES } from "@/lib/mock-data/_lama-employee-work-types";
import { REAL_LAMA_POSITIONS } from "@/lib/mock-data/_lama-real";

/** Сегодняшняя дата в моках — синхронизируем с MOCK_SHIFTS / MOCK_TASKS. */
const TODAY = "2026-05-01";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms: number = 300) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────────────────────────────────
// LAMA derivation helpers — для 1850+ реальных сотрудников у которых
// MOCK_PERMISSIONS / MOCK_FUNCTIONAL_ROLES / scope не заполнены вручную.
// Используем то что реально дала LAMA: типы работ из истории + позицию.
// При swap на real backend эти fallback'и удаляются — backend отдаст
// реальные granted permissions (см. MIGRATION-NOTES.md).
// ───────────────────────────────────────────────────────────────────

/** Маппинг LAMA work_type → admin Permission. */
const LAMA_WORKTYPE_TO_PERMISSION: Record<string, Permission> = {
  "Касса": "CASHIER",
  "КСО": "SELF_CHECKOUT",
  "Выкладка": "SALES_FLOOR",
  "Переоценка": "SALES_FLOOR",
  "Менеджерские операции": "SALES_FLOOR",
  "Инвентаризация": "WAREHOUSE",
  "Другие работы": "SALES_FLOOR",
};

/** Position id → functional_role default (через REAL_LAMA_POSITIONS). */
const LAMA_POSITION_FROLE: Map<number, FunctionalRole> = new Map(
  REAL_LAMA_POSITIONS.map((p) => [
    p.id,
    (p.functional_role_default as FunctionalRole | undefined) ?? "WORKER",
  ]),
);

/** Derive permissions из LAMA work-types (deduped, отсортирован). */
function deriveLamaPermissions(userId: number): Permission[] {
  const workTypes = LAMA_EMPLOYEE_WORK_TYPES[userId];
  if (!workTypes) return [];
  const set = new Set<Permission>();
  for (const wt of workTypes) {
    const p = LAMA_WORKTYPE_TO_PERMISSION[wt];
    if (p) set.add(p);
  }
  return Array.from(set).sort();
}

/** Derive functional role из active assignment + position default. */
function deriveLamaFunctionalRole(userId: number): FunctionalRole | undefined {
  const a = MOCK_ASSIGNMENTS.find((x) => x.user_id === userId && x.active);
  if (!a) return undefined;
  return LAMA_POSITION_FROLE.get(a.position_id);
}

/** Build WorkerPermission[] из LAMA-derived (для UserDetail.permissions). */
function buildLamaWorkerPermissions(
  userId: number,
  hiredAt: string,
): WorkerPermission[] {
  const perms = deriveLamaPermissions(userId);
  // Стабильные id в негативном диапазоне чтобы не пересекались с MOCK_PERMISSIONS.
  return perms.map((p, idx) => ({
    id: -(userId * 10 + idx),
    user_id: userId,
    permission: p,
    granted_at: hiredAt,
    granted_by_name: "LAMA импорт",
  }));
}

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
  /**
   * Формат магазина текущего active assignment. Используется операционным
   * директором / супервайзером для срезов по формату (норма по людям на зону
   * у HYPERMARKET / SUPERMARKET / CONVENIENCE / DISCOUNTER различается).
   * Resolved через MOCK_STORES.object_format по active assignment.store_id.
   */
  object_format?: ObjectFormat;
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
    object_format,
    freelancer_status,
    agent_ids,
    source,
    archived = false,
    page = 1,
    page_size = 20,
    // Default: id desc → реальные LAMA сотрудники (id 300+) идут первыми,
    // демка показывает живые ФИО Томск/Северск/Новосибирск, а не синтетических
    // персонажей-логинов 1-29. Synthetic personas остаются доступны через поиск.
    sort_by = "id",
    sort_dir = "desc",
  } = params;

  let filtered = [...MOCK_USERS];

  // Filter by archived status
  filtered = filtered.filter((u) => u.archived === archived);

  // Filter by role (using functional roles + LAMA fallback)
  if (role) {
    const explicitRoleUserIds = new Set(
      MOCK_FUNCTIONAL_ROLES
        .filter((r) => r.functional_role === role)
        .map((r) => r.user_id),
    );
    filtered = filtered.filter((u) => {
      if (explicitRoleUserIds.has(u.id)) return true;
      // LAMA fallback: derive role из позиции в active assignment.
      return deriveLamaFunctionalRole(u.id) === role;
    });
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
    const grantedSet = new Set(
      MOCK_PERMISSIONS
        .filter((p) => !p.revoked_at && effectivePermissions.includes(p.permission))
        .map((p) => p.user_id),
    );
    filtered = filtered.filter((u) => {
      if (grantedSet.has(u.id)) return true;
      // LAMA fallback: derive permissions из истории work_types.
      const lamaPerms = deriveLamaPermissions(u.id);
      return lamaPerms.some((p) => effectivePermissions.includes(p));
    });
  }

  // Filter by employment type
  if (employment_type) {
    filtered = filtered.filter((u) => u.type === employment_type);
  }

  // Filter by store object_format (через active assignment.store_id → MOCK_STORES).
  // Норма по людям на зону отличается между форматами — операционный директор
  // и супервайзер используют этот срез для планирования.
  if (object_format) {
    const matchingStoreIds = new Set(
      MOCK_STORES
        .filter((s) => s.object_format === object_format)
        .map((s) => s.id),
    );
    const matchingUserIds = new Set(
      MOCK_ASSIGNMENTS
        .filter((a) => a.active && matchingStoreIds.has(a.store_id))
        .map((a) => a.user_id),
    );
    filtered = filtered.filter((u) => matchingUserIds.has(u.id));
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
    let cmp: number;
    if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal));
    }
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

    const explicitPerms = MOCK_PERMISSIONS
      .filter((p) => p.user_id === user.id && !p.revoked_at)
      .map((p) => p.permission);
    // LAMA fallback: если нет явных permissions, выводим из истории work_types.
    // (1850+ LAMA сотрудников не имеют записей в MOCK_PERMISSIONS — без этого
    // в employees-list был бы пустой столбец «Привилегии».)
    const userPerms = explicitPerms.length > 0
      ? explicitPerms
      : deriveLamaPermissions(user.id);

    const funcRole =
      MOCK_FUNCTIONAL_ROLES.find((r) => r.user_id === user.id)?.functional_role
      ?? deriveLamaFunctionalRole(user.id);

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
  const explicitPermissions = MOCK_PERMISSIONS.filter((p) => p.user_id === id);
  // LAMA fallback: если нет явных permissions — генерируем из work-types истории.
  const permissions: WorkerPermission[] =
    explicitPermissions.length > 0
      ? explicitPermissions
      : buildLamaWorkerPermissions(id, user.hired_at ?? TODAY);

  // Resolve functional scope (с LAMA fallback)
  const roleAssignment = MOCK_FUNCTIONAL_ROLES.find((r) => r.user_id === id);
  let functional_scope: UserFunctionalScope | undefined;
  if (roleAssignment) {
    functional_scope = {
      functional_role: roleAssignment.functional_role,
      scope_type: roleAssignment.scope_type,
      scope_ids: roleAssignment.scope_ids,
    };
  } else {
    // LAMA fallback: scope_type=STORE, scope = active assignment store.
    const lamaRole = deriveLamaFunctionalRole(id);
    const activeAssignment = assignments.find((a) => a.active);
    if (lamaRole && activeAssignment) {
      functional_scope = {
        functional_role: lamaRole,
        scope_type: "STORE",
        scope_ids: [activeAssignment.store_id],
        scope_store_names: [activeAssignment.store_name],
      };
    }
  }

  // Current shift
  const current_shift = MOCK_SHIFTS.find(
    (s) => s.user_id === id && s.shift_date === TODAY,
  ) ?? null;

  // Mock realistic stats for demo user 101, deterministic-by-id для остальных
  // (Math.random на каждый запрос → цифры скакали бы при reload — плохо для демо.)
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
      : (() => {
          // Detrm seed: используем id чтобы цифры были стабильны между загрузками.
          const seed = (n: number) => (id * 9301 + n * 49297) % 233280;
          const rng = (n: number, lo: number, hi: number) =>
            lo + (seed(n) % (hi - lo + 1));
          const total = rng(1, 30, 95);
          const accepted = Math.floor(total * (0.78 + (seed(2) % 15) / 100));
          const rejected = Math.max(0, Math.min(total - accepted, rng(3, 0, 7)));
          return {
            tasks_total: total,
            tasks_diff_pct: rng(4, -8, 18),
            tasks_accepted: accepted,
            tasks_rejected: rejected,
            paused_now: rng(5, 0, 2),
            avg_completion_min: rng(6, 28, 68),
            avg_completion_diff_min: rng(7, -7, 9),
          };
        })();

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
// EMPLOYEE HISTORY EVENTS (для employee-detail tab «История»)
// ═══════════════════════════════════════════════════════════════════

export type UserHistoryEventType =
  | "system"
  | "permission_granted"
  | "permission_revoked"
  | "assignment_created"
  | "assignment_archived";

/** Один event истории сотрудника. */
export interface UserHistoryEvent {
  id: string;
  occurred_at: string;
  actor: string;
  action_label: string;
  type: UserHistoryEventType;
}

/**
 * Get derived history events for a user (assignment creation + permission
 * grants/revokes + system import). Используем существующие данные —
 * MOCK_PERMISSIONS / MOCK_ASSIGNMENTS / LAMA-derived permissions / hired_at.
 *
 * При swap на real backend — эндпоинт `GET /users/{id}/history` возвращает
 * полный audit log; пока деривируем из доступных данных.
 *
 * @endpoint GET /users/{id}/history (derived/admin-only)
 */
export async function getUserHistoryEvents(
  id: number,
): Promise<ApiResponse<UserHistoryEvent[]>> {
  await delay(220);

  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) {
    return { data: [] };
  }

  const events: UserHistoryEvent[] = [];
  const hiredAt = user.hired_at ?? TODAY;

  // 1. Hired event — дата приёма на работу.
  events.push({
    id: `u-${id}-hired`,
    occurred_at: `${hiredAt}T07:00:00Z`,
    actor: "Системный импорт",
    action_label: "Сотрудник добавлен в систему",
    type: "system",
  });

  // 2. Assignment events — все назначения.
  const assignments = MOCK_ASSIGNMENTS.filter((a) => a.user_id === id);
  for (const a of assignments) {
    events.push({
      id: `u-${id}-asg-${a.id}`,
      occurred_at: `${hiredAt}T07:30:00Z`,
      actor: "HR-менеджер",
      action_label: `Назначен(а) на должность «${a.position_name}» в магазине ${a.store_name}`,
      type: "assignment_created",
    });
  }

  // 3. Explicit permission events из MOCK_PERMISSIONS.
  const explicitPerms = MOCK_PERMISSIONS.filter((p) => p.user_id === id);
  for (const p of explicitPerms) {
    events.push({
      id: `u-${id}-perm-${p.id}-granted`,
      occurred_at: `${p.granted_at}T09:00:00Z`,
      actor: p.granted_by_name,
      action_label: `Назначена привилегия ${p.permission}`,
      type: "permission_granted",
    });
    if (p.revoked_at) {
      events.push({
        id: `u-${id}-perm-${p.id}-revoked`,
        occurred_at: `${p.revoked_at}T09:00:00Z`,
        actor: p.revoked_by_name ?? "Система",
        action_label: `Отозвана привилегия ${p.permission}`,
        type: "permission_revoked",
      });
    }
  }

  // 4. Если не было explicit perms — добавим LAMA-derived (как «импорт из LAMA»).
  if (explicitPerms.length === 0) {
    const lamaPerms = deriveLamaPermissions(id);
    for (const p of lamaPerms) {
      events.push({
        id: `u-${id}-lama-perm-${p}`,
        occurred_at: `${hiredAt}T08:00:00Z`,
        actor: "LAMA импорт",
        action_label: `Назначена привилегия ${p} (по истории работ)`,
        type: "permission_granted",
      });
    }
  }

  // Newest first.
  events.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  return { data: events };
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
 * Параметры для permissions coverage stats. Зеркалят user-list filters
 * чтобы stat-cards пересчитывались под текущий фильтр matrix-экрана.
 */
export interface PermissionsCoverageParams {
  /** Поиск по ФИО/телефону (как в getUsers). */
  search?: string;
  /** Один магазин (legacy + scope для STORE_DIRECTOR/SUPERVISOR). */
  store_id?: number;
  /** Должность (фильтр position-list). */
  position_id?: number;
  /** Конкретная привилегия — оставляем пользователей у которых есть хоть одна. */
  permission?: Permission;
}

/**
 * Get coverage statistics for permissions in scope.
 * Считает grant'ы как `getUsers` enrichment — explicit MOCK_PERMISSIONS,
 * иначе LAMA-derived из истории work_types. Manager-фильтр тоже учитывает
 * LAMA-derived functional role.
 *
 * Принимает full filter set (search/store/position/permission) — stat-cards
 * пересчитываются под текущий фильтр permissions-matrix экрана. Без фильтров
 * считает по всему non-archived non-manager пулу.
 *
 * @param params filter params (или number для backward-compat — storeId)
 * @returns coverage row per permission (5: CASHIER, SALES_FLOOR, SELF_CHECKOUT, WAREHOUSE, PRODUCTION_LINE)
 * @endpoint GET /users/permissions/coverage?store_id=&position_id=&search=&permission=
 * @roles STORE_DIRECTOR (свой магазин), SUPERVISOR, NETWORK_OPS
 */
export async function getPermissionsCoverage(
  params?: PermissionsCoverageParams | number,
): Promise<ApiResponse<PermissionCoverageRow[]>> {
  await delay(250);

  // Backward-compat: getPermissionsCoverage(123) → { store_id: 123 }.
  const p: PermissionsCoverageParams =
    typeof params === "number"
      ? { store_id: params }
      : params ?? {};
  const { search, store_id, position_id, permission } = p;

  const ALL: Permission[] = [
    "CASHIER",
    "SALES_FLOOR",
    "SELF_CHECKOUT",
    "WAREHOUSE",
    "PRODUCTION_LINE",
  ];

  // ── Manager detection: explicit MOCK_FUNCTIONAL_ROLES + LAMA-derived ──
  // (LAMA-derived role !== "WORKER" → исключаем как manager).
  const explicitRoles = new Map<number, FunctionalRole>(
    MOCK_FUNCTIONAL_ROLES.map((r) => [r.user_id, r.functional_role]),
  );
  const isUserManager = (userId: number): boolean => {
    const explicit = explicitRoles.get(userId);
    if (explicit) return explicit !== "WORKER";
    const derived = deriveLamaFunctionalRole(userId);
    return derived !== undefined && derived !== "WORKER";
  };

  // ── Permissions resolver: explicit OR LAMA-derived (same logic as getUsers) ──
  const explicitPermsByUser = new Map<number, Set<Permission>>();
  for (const mp of MOCK_PERMISSIONS) {
    if (mp.revoked_at) continue;
    const set = explicitPermsByUser.get(mp.user_id) ?? new Set<Permission>();
    set.add(mp.permission);
    explicitPermsByUser.set(mp.user_id, set);
  }
  const userPerms = (userId: number): Permission[] => {
    const explicit = explicitPermsByUser.get(userId);
    if (explicit && explicit.size > 0) return Array.from(explicit);
    return deriveLamaPermissions(userId);
  };

  // ── Build eligible pool (matches matrix table scope) ──
  let eligibleUsers = MOCK_USERS.filter(
    (u) => !u.archived && !isUserManager(u.id),
  );

  if (store_id) {
    const storeUserIds = new Set(
      MOCK_ASSIGNMENTS
        .filter((a) => a.active && a.store_id === store_id)
        .map((a) => a.user_id),
    );
    eligibleUsers = eligibleUsers.filter((u) => storeUserIds.has(u.id));
  }

  if (position_id) {
    const positionUserIds = new Set(
      MOCK_ASSIGNMENTS
        .filter((a) => a.active && a.position_id === position_id)
        .map((a) => a.user_id),
    );
    eligibleUsers = eligibleUsers.filter((u) => positionUserIds.has(u.id));
  }

  if (permission) {
    eligibleUsers = eligibleUsers.filter((u) =>
      userPerms(u.id).includes(permission),
    );
  }

  if (search) {
    const q = search.toLowerCase();
    eligibleUsers = eligibleUsers.filter(
      (u) =>
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        (u.middle_name?.toLowerCase().includes(q) ?? false) ||
        u.phone.includes(search),
    );
  }

  const eligible_count = eligibleUsers.length;

  const rows: PermissionCoverageRow[] = ALL.map((perm) => {
    const granted_count = eligibleUsers.reduce(
      (acc, u) => (userPerms(u.id).includes(perm) ? acc + 1 : acc),
      0,
    );

    const coverage_pct =
      eligible_count === 0
        ? 0
        : Math.round((granted_count / eligible_count) * 100);

    // Mock 30-day trend — детерминированный по permission (чтобы график не прыгал)
    const seed = perm.length;
    const trend_30d = Array.from({ length: 30 }, (_, i) => {
      const noise = ((i + seed) * 7) % 11 - 5; // -5..+5
      return Math.max(
        0,
        Math.min(100, coverage_pct - 10 + noise + Math.floor(i / 3)),
      );
    });

    return {
      permission: perm,
      granted_count,
      eligible_count,
      coverage_pct,
      trend_30d,
    };
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

// ═══════════════════════════════════════════════════════════════════
// REAL BACKEND: GET /users/{id}, PATCH /users/{id}, PATCH /users/{id}/permissions
// ═══════════════════════════════════════════════════════════════════

import { backendPatch } from "./_client";
import type {
  BackendUserResponse,
  BackendUserUpdate,
  BackendPermissionsUpdate,
  BackendPermissionType,
} from "./_backend-types";

/**
 * Сырой backend GET /users/{id} — возвращает BackendUserResponse как есть.
 * Нужен для consumer'ов которые сами адаптируют под admin shape.
 *
 * Ограничение backend: только MANAGER может вызывать, и только на пользователей
 * своего магазина. Иначе FORBIDDEN.
 *
 * @endpoint GET /users/{user_id}
 */
export async function getUserByIdFromBackend(
  id: number,
): Promise<BackendUserResponse> {
  return backendGet<BackendUserResponse>(apiUrl("users", `/${id}`));
}

/**
 * PATCH /users/{id}.
 * @endpoint PATCH /users/{user_id}
 */
export async function updateUserOnBackend(
  id: number,
  data: BackendUserUpdate,
): Promise<BackendUserResponse> {
  return backendPatch<BackendUserResponse>(apiUrl("users", `/${id}`), data);
}

/**
 * PATCH /users/{id}/permissions.
 * Backend принимает полный список — добавляет новые, soft-удаляет отсутствующие.
 * @endpoint PATCH /users/{user_id}/permissions
 */
export async function updateUserPermissionsOnBackend(
  id: number,
  permissions: BackendPermissionType[],
): Promise<BackendUserResponse> {
  const body: BackendPermissionsUpdate = { permissions };
  return backendPatch<BackendUserResponse>(
    apiUrl("users", `/${id}/permissions`),
    body,
  );
}

// ── Стратегия по mutations ──────────────────────────────────────────
// Lossy dispatch (admin → backend с потерей admin-полей) НЕ делаем — admin
// model богаче backend (см. MIGRATION-NOTES.md в корне репо).
// Эти raw-обёртки expose-ят backend endpoint'ы как есть, чтобы:
//   1. backend-dev мог использовать их сразу для интеграции
//   2. UI-слои сами решали как смерджить ответ backend с admin-extras
//
// Полный swap состоится когда backend дотянет свои Pydantic schemas
// до admin-уровня (region, manager_id, format_shop, internal_company,
// stats, goals, freelance flow и т.д.)
