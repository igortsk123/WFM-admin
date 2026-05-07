/**
 * TypeScript типы зеркалят Pydantic schemas backend.
 *
 * Источник правды: backend/svc_users/app/domain/schemas.py + svc_tasks/.../schemas.py.
 * При изменении backend-контракта — обновлять здесь.
 *
 * Naming convention: `Backend{Entity}` чтобы не путать с admin domain types.
 */

// ── Common ──────────────────────────────────────────────────────────

export interface BackendStore {
  id: number;
  name: string;
  address?: string | null;
  external_code?: string | null;
  created_at: string; // ISO datetime
}

export interface BackendStoreListData {
  stores: BackendStore[];
}

// ── Permissions / Roles / Positions ──────────────────────────────────

export type BackendPermissionType =
  | "CASHIER"
  | "SALES_FLOOR"
  | "SELF_CHECKOUT"
  | "WAREHOUSE";

export interface BackendPermission {
  id: string; // UUID
  permission: BackendPermissionType;
  granted_at: string;
  granted_by: number;
}

export interface BackendRole {
  id: number;
  code: string; // "worker" | "manager"
  name: string;
  description?: string | null;
}

export interface BackendPosition {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  role?: BackendRole | null;
}

export interface BackendRank {
  id: number;
  code: string;
  name: string;
}

export interface BackendEmployeeType {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

export interface BackendAssignment {
  id: number;
  external_id?: number | null;
  company_name?: string | null;
  position?: BackendPosition | null;
  rank?: BackendRank | null;
  store?: BackendStore | null;
  date_start?: string | null;
  date_end?: string | null;
}

export interface BackendUserMe {
  id: number;
  sso_id: string; // UUID
  external_id?: number | null;
  employee_type?: BackendEmployeeType | null;
  permissions: BackendPermission[];
  assignments: BackendAssignment[];
  // SSO-merged
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  gender?: string | null;
  birth_date?: string | null;
}

/** Базовый user response (без SSO merge), возвращается /users/{id} и /users/{id}/permissions */
export interface BackendUserResponse {
  id: number;
  sso_id: string;
  external_id?: number | null;
  employee_type?: BackendEmployeeType | null;
  permissions: BackendPermission[];
  assignments: BackendAssignment[];
  updated_at: string;
}

/** PATCH /users/{id} body */
export interface BackendUserUpdate {
  external_id?: number | null;
  type_id?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
}

/** PATCH /users/{id}/permissions body */
export interface BackendPermissionsUpdate {
  permissions: BackendPermissionType[];
}

// ── Tasks ────────────────────────────────────────────────────────────

export type BackendTaskType = "PLANNED" | "ADDITIONAL";
export type BackendTaskState = "NEW" | "IN_PROGRESS" | "PAUSED" | "COMPLETED";
export type BackendTaskReviewState =
  | "NONE"
  | "ON_REVIEW"
  | "ACCEPTED"
  | "REJECTED";
export type BackendAcceptancePolicy = "AUTO" | "MANUAL";

export interface BackendWorkType {
  id: number;
  name: string;
  requires_photo: boolean;
  acceptance_policy: string;
  allow_new_operations: boolean;
}

export interface BackendZone {
  id: number;
  name: string;
  priority: number;
}

export interface BackendCategory {
  id: number;
  name: string;
}

export type BackendOperationReviewState = "ACCEPTED" | "PENDING" | "REJECTED";

export interface BackendOperation {
  id: number;
  name: string;
  review_state: BackendOperationReviewState;
  display_order?: number | null;
}

export interface BackendOperationListData {
  operations: BackendOperation[];
}

export interface BackendHint {
  id: number;
  work_type_id: number;
  zone_id: number;
  text: string;
}

export interface BackendHintListData {
  hints: BackendHint[];
}

export interface BackendHintCreate {
  work_type_id: number;
  zone_id: number;
  text: string;
}

export interface BackendHintUpdate {
  text: string;
}

export interface BackendWorkInterval {
  time_start: string; // ISO datetime
  time_end?: string | null;
}

export interface BackendHistoryBrief {
  time_start?: string | null;
  duration: number; // seconds
  time_state_updated?: string | null;
  work_intervals: BackendWorkInterval[];
}

export interface BackendAssigneeBrief {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
}

export interface BackendTask {
  id: string; // UUID
  title: string;
  description: string;
  planned_minutes: number;
  creator_id?: number | null;
  assignee_id?: number | null;
  type: BackendTaskType;
  state: BackendTaskState;
  review_state: BackendTaskReviewState;
  acceptance_policy: BackendAcceptancePolicy;
  created_at: string;
  updated_at: string;
  requires_photo: boolean;
  report_text?: string | null;
  report_image_url?: string | null;
  external_id?: number | null;
  shift_id?: number | null;
  priority?: number | null;
  work_type_id?: number | null;
  work_type?: BackendWorkType | null;
  zone_id?: number | null;
  zone?: BackendZone | null;
  category_id?: number | null;
  category?: BackendCategory | null;
  time_start?: string | null; // HH:MM:SS
  time_end?: string | null;
  source?: string;
  comment?: string | null;
  review_comment?: string | null;
  assignee?: BackendAssigneeBrief | null;
  history_brief?: BackendHistoryBrief | null;
  operations: BackendOperation[];
  completed_operation_ids: number[];
}

export interface BackendTaskListData {
  tasks: BackendTask[];
}

export interface BackendTaskCreate {
  title: string;
  description: string;
  planned_minutes: number;
  creator_id: number;
  assignee_id?: number | null;
  type?: BackendTaskType;
  shift_id?: number | null;
  work_type_id?: number | null;
  zone_id?: number | null;
  category_id?: number | null;
  acceptance_policy?: BackendAcceptancePolicy;
  comment?: string | null;
  requires_photo?: boolean;
}

export interface BackendTaskUpdate {
  title?: string;
  description?: string;
  planned_minutes?: number;
  assignee_id?: number | null;
  work_type_id?: number | null;
  zone_id?: number | null;
  category_id?: number | null;
  acceptance_policy?: BackendAcceptancePolicy;
  comment?: string | null;
  requires_photo?: boolean;
}

export interface BackendTaskRejectRequest {
  reason: string;
}

// ── Task list filters / users ────────────────────────────────────────

export interface BackendFilterItem {
  id: number;
  title: string;
}

export interface BackendFilterGroup {
  id: string;
  title: string;
  array: BackendFilterItem[];
}

export interface BackendTaskListFiltersData {
  filters: BackendFilterGroup[];
  /** Только в /list/filters/v2; пустой в v1. */
  task_filter_indices: number[][];
}

export interface BackendPositionBrief {
  id: number;
  code: string;
  name: string;
}

export interface BackendTaskListUserItem {
  assignment_id: number;
  user_id: number;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  position?: BackendPositionBrief | null;
}

export interface BackendTaskListUsersData {
  users: BackendTaskListUserItem[];
}

// ── Task events ──────────────────────────────────────────────────────

export type BackendTaskEventType =
  | "CREATED"
  | "UPDATED"
  | "ASSIGNED"
  | "START"
  | "PAUSE"
  | "RESUME"
  | "COMPLETE"
  | "SEND_TO_REVIEW"
  | "AUTO_ACCEPT"
  | "APPROVE"
  | "REJECT";

export interface BackendTaskEvent {
  id: number;
  task_id: string;
  event_type: BackendTaskEventType;
  actor_id?: number | null;
  actor_role: string;
  old_state?: string | null;
  new_state?: string | null;
  old_review_state?: string | null;
  new_review_state?: string | null;
  comment?: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
}

export interface BackendTaskEventListData {
  events: BackendTaskEvent[];
}

// ── Shifts ───────────────────────────────────────────────────────────

export type BackendShiftStatus = "NEW" | "OPENED" | "CLOSED";

export interface BackendShiftPlan {
  id: number;
  assignment_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  created_by?: number | null;
}

export interface BackendShiftOpenRequest {
  plan_id: number;
}

export interface BackendShiftCloseRequest {
  plan_id: number;
  force?: boolean;
}

export interface BackendCurrentShift {
  id: number;
  plan_id?: number | null;
  status: BackendShiftStatus;
  assignment_id: number;
  opened_at?: string | null;
  closed_at?: string | null;
  shift_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  external_id?: number | null;
  duration?: number | null;
}
