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
} from "@/lib/types";
import { MOCK_USERS } from "@/lib/mock-data";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";
import { MOCK_PERMISSIONS } from "@/lib/mock-data/permissions";
import { MOCK_FUNCTIONAL_ROLES } from "@/lib/mock-data/functional-roles";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms: number = 300) => new Promise((r) => setTimeout(r, ms));

/** User with embedded assignment and permissions list */
export interface UserWithAssignment extends User {
  assignment: Assignment;
  permissions: Permission[];
}

/** User with full assignments and permissions history */
export interface UserDetail extends User {
  assignments: Assignment[];
  permissions: WorkerPermission[];
}

/** User filter parameters */
export interface UserListParams extends ApiListParams {
  role?: FunctionalRole;
  store_id?: number;
  permission?: Permission;
  archived?: boolean;
}

/** User create payload */
export interface UserCreateData extends Partial<User> {
  position_id: number;
  store_id: number;
  send_invite: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

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
    permission,
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

  // Filter by store
  if (store_id) {
    const storeUserIds = MOCK_ASSIGNMENTS
      .filter((a) => a.store_id === store_id && a.active)
      .map((a) => a.user_id);
    filtered = filtered.filter((u) => storeUserIds.includes(u.id));
  }

  // Filter by permission
  if (permission) {
    const permUserIds = MOCK_PERMISSIONS
      .filter((p) => p.permission === permission && !p.revoked_at)
      .map((p) => p.user_id);
    filtered = filtered.filter((u) => permUserIds.includes(u.id));
  }

  // Search by name
  if (search) {
    const lowerSearch = search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.first_name.toLowerCase().includes(lowerSearch) ||
        u.last_name.toLowerCase().includes(lowerSearch) ||
        u.phone.includes(search)
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

  // Enrich with assignment and permissions
  const enriched: UserWithAssignment[] = paginated.map((user) => {
    const assignment = MOCK_ASSIGNMENTS.find(
      (a) => a.user_id === user.id && a.active
    ) ?? MOCK_ASSIGNMENTS.find((a) => a.user_id === user.id)!;

    const userPerms = MOCK_PERMISSIONS
      .filter((p) => p.user_id === user.id && !p.revoked_at)
      .map((p) => p.permission);

    return {
      ...user,
      assignment,
      permissions: userPerms,
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
 * Get single user by ID with full assignments and permissions history.
 * @param id User ID
 * @returns User with all assignments and permissions
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

  return {
    data: {
      ...user,
      assignments,
      permissions,
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
