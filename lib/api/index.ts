/**
 * API Layer - Single integration point for future Python backend.
 *
 * All data access MUST go through this layer. Components and pages
 * should never import from lib/mock-data/ directly.
 *
 * Each function is documented with JSDoc including the future REST endpoint
 * it will map to when connected to the real backend.
 */

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
} from "./types";

// ═══════════════════════════════════════════════════════════════════
// Auth API
// ═══════════════════════════════════════════════════════════════════

export {
  // Types
  type CurrentUser,
  type AuthTokenResponse,
  type TotpSetupResponse,
  // Current user & role
  getCurrentUser,
  mockSwitchRole,
  impersonateUser,
  exitImpersonation,
  // Phone auth (Beyond Violet SSO)
  requestPhoneCode,
  verifyPhoneCode,
  // Email magic link
  requestEmailMagicLink,
  verifyEmailMagicLink,
  // TOTP
  setupTotp,
  verifyTotp,
  disableTotp,
  // Locale
  updateUserLocale,
} from "./auth";

// ═══════════════════════════════════════════════════════════════════
// Users API
// ═══════════════════════════════════════════════════════════════════

export {
  // Types
  type UserWithAssignment,
  type UserDetail,
  type UserListParams,
  type UserCreateData,
  // List & Get
  getUsers,
  getUserById,
  // Create / Update / Archive
  createUser,
  updateUser,
  archiveUser,
  // Permissions
  updateUserPermissions,
  bulkAssignPermission,
  bulkRevokePermission,
} from "./users";

// ═══════════════════════════════════════════════════════════════════
// Tasks API
// ═══════════════════════════════════════════════════════════════════

export {
  // Types
  type TaskWithAvatar,
  type TaskDetail,
  type TaskListParams,
  type TaskFiltersResponse,
  type SubtaskWithTaskTitle,
  // List & Get
  getTasks,
  getTaskById,
  getTaskFilters,
  // Create / Update
  createTask,
  updateTask,
  // Archive & Restore
  archiveTask,
  restoreTask,
  bulkArchiveTasks,
  // Actions
  transferTask,
  approveTask,
  rejectTask,
  bulkAssignTasks,
  // Subtasks
  getSubtasksPending,
  approveSubtask,
  rejectSubtask,
  addSubtaskToTask,
  removeSubtask,
} from "./tasks";

// ═══════════════════════════════════════════════════════════════════
// Hints API
// ═══════════════════════════════════════════════════════════════════

export {
  getHints,
  createHint,
  updateHint,
  deleteHint,
} from "./hints";
