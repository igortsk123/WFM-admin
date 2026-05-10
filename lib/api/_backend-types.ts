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

// ── Store schedule (admin-only пока — backend нужно дотянуть) ──
//
// Endpoint которого сейчас нет у backend, но admin /schedule (/расписание)
// его ожидает: `GET /shifts/by-store?store_id=&date_from=&date_to=&zone_id=`.
// Backend сейчас умеет только `/shifts/current?assignment_id=` (одна смена
// одного сотрудника). Для календарной сетки на день/неделю/месяц admin'у
// нужны ВСЕ смены магазина(ов) на диапазон дат, plus aggregate'ы (planned
// vs actual hours, coverage_pct).
//
// Когда backend дотянет — admin переключит `getSchedule()` с MOCK_SHIFTS
// на `getStoreScheduleOnBackend()` без UI changes.

export interface BackendScheduleSlot {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar_url?: string | null;
  store_id: number;
  store_name: string;
  zone_id?: number | null;
  zone_name?: string | null;
  position_id?: number | null;
  position_name?: string | null;
  shift_date: string; // yyyy-MM-dd
  planned_start: string; // ISO
  planned_end: string; // ISO
  actual_start?: string | null;
  actual_end?: string | null;
  status: BackendShiftStatus;
  has_conflict?: boolean;
  conflict_reason?: "OVERLAP" | "LATE_CLOSE" | "OVERFLOW" | "OTHER" | null;
  late_minutes?: number;
  overtime_minutes?: number;
}

export interface BackendStoreSchedule {
  slots: BackendScheduleSlot[];
  date_from: string;
  date_to: string;
  total_planned_hours: number;
  total_actual_hours: number;
  coverage_pct: number;
}

export interface BackendStoreScheduleParams {
  store_id?: number;
  store_ids?: number[];
  date_from: string;
  date_to: string;
  zone_id?: number;
  zone_ids?: number[];
  user_id?: number;
  status?: BackendShiftStatus[];
}

// ── UnassignedTaskBlock (admin-only пока — backend нужно дотянуть) ──
//
// Концепция: LAMA каждый день выгружает блоки трудозатрат на магазин:
//   POST /tasks/unassigned-blocks/sync (от LAMA в наш backend)
//   GET /tasks/unassigned-blocks?store_id=&date=
//   POST /tasks/unassigned-blocks/{id}/distribute (body: allocations[])
//
// Backend в текущем виде получает уже распределённые задачи (в /tasks/list).
// Чтобы admin мог делать распределение через UI — backend нужно ввести
// этот endpoint. См. MIGRATION-NOTES.md "Запрос: blocks API".

export interface BackendUnassignedTaskBlock {
  id: string;
  store_id: number;
  store_name: string;
  date: string; // yyyy-MM-dd
  work_type_id: number;
  work_type_name: string;
  zone_id: number;
  zone_name: string;
  product_category_id?: number | null;
  product_category_name?: string | null;
  title: string;
  total_minutes: number;
  distributed_minutes: number;
  remaining_minutes: number;
  priority?: number;
  source: "LAMA" | "MANAGER" | "AI";
  created_at: string;
  is_distributed: boolean;
  spawned_task_ids: string[];
}

export interface BackendBlockAllocation {
  user_id: number;
  minutes: number;
}

export interface BackendDistributeBlockRequest {
  allocations: BackendBlockAllocation[];
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

// ── Goals (admin-only feature, see MIGRATION-NOTES для контракта) ────
//
// Goals не существуют в текущем backend. Admin держит карту ожидаемого
// REST контракта здесь — backend подтянется когда будем swap'ать.
//
// Главное: AI-evidence транспорт. 3 источника signal'ов (POS / ERP / Photo)
// + поля прозрачности (`ai_signal_source`, `ai_detection_method`,
// `ai_evidence`) — это наша админ-надстройка над «голым» backend Goal.
//
// См. `lib/api/goals.ts::getGoalsOnBackend()` (raw wrapper, готов к swap).

export type BackendAISignalSource =
  | "pos-cheque"
  | "erp-stock"
  | "erp-price-master"
  | "photo-bonus"
  | "wfm-schedule"
  | "egais"
  | "mixed";

export interface BackendAIEvidenceItem {
  source: BackendAISignalSource;
  summary: string;
  summary_en?: string | null;
  observed_from?: string | null;
  observed_to?: string | null;
  scope_hint?: string | null;
  scope_hint_en?: string | null;
  /** Только для source="photo-bonus": URL фото в S3. */
  photo_url?: string | null;
  /** Только для photo-bonus: ФИО снявшего сотрудника. */
  photo_taken_by?: string | null;
  photo_taken_at?: string | null;
}

export type BackendGoalCategory =
  | "OOS_REDUCTION"
  | "WRITE_OFFS"
  | "PROMO_QUALITY"
  | "PRICE_ACCURACY"
  | "IMPULSE_ZONES"
  | "PRODUCTIVITY"
  | "CUSTOM";

export type BackendGoalStatus = "PROPOSED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type BackendGoalDirection = "increase" | "decrease";
export type BackendGoalTier = "priority" | "secondary";
export type BackendPilotWave = "A" | "B" | "C" | "D";
export type BackendMoneyImpactPeriod = "week" | "month" | "quarter" | "year";
export type BackendMoneyImpactType =
  | "money"
  | "compliance"
  | "quality"
  | "training";

export interface BackendMoneyImpact {
  amount: number;
  period: BackendMoneyImpactPeriod;
  rationale_short: string;
  rationale_breakdown: string[];
  rationale_short_en?: string | null;
  rationale_breakdown_en?: string[] | null;
  impact_type: BackendMoneyImpactType;
  significance_score?: number | null;
}

export interface BackendGoal {
  id: string;
  category: BackendGoalCategory;
  title: string;
  description: string;
  title_en?: string | null;
  description_en?: string | null;
  starting_value?: number | null;
  target_value: number;
  target_unit: string;
  current_value: number;
  direction?: BackendGoalDirection | null;
  status: BackendGoalStatus;
  store_id?: number | null;
  scope: "STORE" | "NETWORK";
  proposed_by: "AI" | "MANAGER";
  selected_by?: number | null;
  selected_at?: string | null;
  period_start: string;
  period_end: string;
  money_impact?: BackendMoneyImpact | null;
  /** AI-evidence транспорт (см. raw wrapper goals.ts). */
  ai_signal_source?: BackendAISignalSource | null;
  ai_detection_method?: string | null;
  ai_detection_method_en?: string | null;
  ai_evidence?: BackendAIEvidenceItem[] | null;
  /**
   * Уровень приоритета цели в портфеле (deep-research отчёт).
   * 5 priority-целей (foundation) + остальные secondary. См. admin
   * `GoalTier`. Если backend не вернёт — admin считает `secondary`.
   */
  tier?: BackendGoalTier | null;
  /**
   * Волна пилотирования (A/B/C/D) из deep-research roadmap'а. Только
   * для `tier: "priority"`. См. admin `PilotWave`.
   */
  pilot_wave?: BackendPilotWave | null;
}

export interface BackendGoalListData {
  goals: BackendGoal[];
}
