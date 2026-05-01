// ═══════════════════════════════════════════════════════════════════
// LOCALE
// ═══════════════════════════════════════════════════════════════════

export type Locale = "ru" | "en";

// ═══════════════════════════════════════════════════════════════════
// FUNCTIONAL ROLES
// ═══════════════════════════════════════════════════════════════════

export type FunctionalRole =
  | "STORE_DIRECTOR"
  | "SUPERVISOR"
  | "REGIONAL"
  | "NETWORK_OPS"
  | "HR_MANAGER"
  | "OPERATOR"
  | "WORKER"
  | "AGENT"
  | "PLATFORM_ADMIN";

// ═══════════════════════════════════════════════════════════════════
// EMPLOYEE TYPE
// ═══════════════════════════════════════════════════════════════════

export type EmployeeType = "STAFF" | "FREELANCE";

// ═══════════════════════════════════════════════════════════════════
// STORE ZONES (permissions)
// ═══════════════════════════════════════════════════════════════════

export type StoreZone =
  | "CASHIER"
  | "SALES_FLOOR"
  | "WAREHOUSE"
  | "OFFICE"
  | "PRODUCTION"
  | "RECEIVING"
  | "CLEANING";

// ═══════════════════════════════════════════════════════════════════
// TASK
// ═══════════════════════════════════════════════════════════════════

export type TaskState =
  | "DRAFT"
  | "OPEN"
  | "IN_PROGRESS"
  | "PAUSED"
  | "BLOCKED"
  | "COMPLETED"
  | "ARCHIVED";

export type TaskReviewState =
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_REVISION";

export type TaskType = "REGULAR" | "BONUS" | "URGENT" | "CHAIN";

export type ArchiveReason =
  | "COMPLETED"
  | "CANCELLED"
  | "DUPLICATE"
  | "IRRELEVANT"
  | "MERGED"
  | "OTHER";

// ═══════════════════════════════════════════════════════════════════
// GOAL
// ═══════════════════════════════════════════════════════════════════

export type GoalCategory =
  | "SALES"
  | "OPERATIONS"
  | "QUALITY"
  | "EFFICIENCY"
  | "CUSTOMER"
  | "INVENTORY";

export type GoalStatus =
  | "DRAFT"
  | "ACTIVE"
  | "AT_RISK"
  | "ACHIEVED"
  | "MISSED"
  | "PAUSED";

// ═══════════════════════════════════════════════════════════════════
// SHIFT
// ═══════════════════════════════════════════════════════════════════

export type ShiftState =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION
// ═══════════════════════════════════════════════════════════════════

export type NotificationCategory =
  | "TASK"
  | "GOAL"
  | "SCHEDULE"
  | "SYSTEM"
  | "AI";

// ═══════════════════════════════════════════════════════════════════
// AI SUGGESTION
// ═══════════════════════════════════════════════════════════════════

export type AISuggestionType =
  | "TASK_SUGGESTION"
  | "GOAL_SUGGESTION"
  | "BONUS_TASK_SUGGESTION"
  | "INSIGHT";

export type AISuggestionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EDITED";

// ═══════════════════════════════════════════════════════════════════
// EMPLOYEE STATUS
// ═══════════════════════════════════════════════════════════════════

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "SICK" | "TERMINATED";
