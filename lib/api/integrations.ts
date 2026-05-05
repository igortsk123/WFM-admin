/**
 * Integrations API — LAMA planner sync, Excel uploads, webhooks, and API keys.
 */

import type { ApiResponse, ApiListResponse, ApiMutationResponse } from "@/lib/types";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type WebhookEventType =
  | "task.created"
  | "task.completed"
  | "task.approved"
  | "task.rejected"
  | "shift.opened"
  | "shift.closed"
  | "goal.activated"
  | "goal.completed";

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  active: boolean;
  last_triggered_at?: string;
  failure_count: number;
  created_at: string;
}

export interface IntegrationsStatus {
  lama: {
    connected: boolean;
    last_sync_at?: string;
    shifts_synced_count: number;
    /** Кол-во пользователей синхронизированных из LAMA (для stats card). */
    users_synced_count?: number;
    /** Кол-во магазинов из LAMA. */
    stores_synced_count?: number;
    /** Health: connected / degraded / disconnected. */
    health?: "connected" | "degraded" | "disconnected";
    error?: string;
  };
  excel: {
    last_upload_at?: string;
    last_upload_type?: "EMPLOYEES" | "SCHEDULE" | "STORES";
    last_upload_status?: "SUCCESS" | "ERROR" | "PARTIAL";
    /** Кол-во импортов за текущий месяц (для stats). */
    monthly_imports_count?: number;
    /** Имя пользователя последнего импорта. */
    last_upload_by_name?: string;
  };
  webhooks: {
    total: number;
    active: number;
    failing: number;
    delivered_today?: number;
  };
  api_keys_count: number;
  api_requests_today?: number;
}

/** LAMA connection configuration (for /integrations/lama Status tab). */
export interface LamaConnection {
  url: string;
  api_token_masked: string;
  tenant_id: string;
  last_test_at?: string;
  last_test_status?: "SUCCESS" | "ERROR";
}

/** Full sync log entry for LAMA detail Logs tab. */
export interface LamaSyncLog {
  id: string;
  started_at: string;
  ended_at?: string;
  trigger: "SCHEDULED" | "MANUAL" | "FORCE";
  type: "FULL" | "INCREMENTAL" | "FORCE";
  status: "SUCCESS" | "ERROR" | "PARTIAL" | "RUNNING";
  duration_ms?: number;
  records_created?: number;
  records_updated?: number;
  error_count?: number;
  error_message?: string;
  payload_json?: Record<string, unknown>;
  error_details?: string[];
  initiator_name?: string;
}

/** Mapping row for LAMA → WFM field mapping tab. */
export interface LamaMappingRow {
  id: string;
  lama_field: string;
  wfm_field: string;
  transform: "none" | "lowercase" | "trim" | "regex";
  required: boolean;
}

/** LAMA schedule config for Schedule tab. */
export interface LamaScheduleConfig {
  enabled: boolean;
  frequency: "hourly" | "6h" | "daily" | "custom";
  cron_expression?: string;
  timezone: string;
  notify_on_error: boolean;
  notify_on_success: boolean;
  recipients: string[];
}

/** Запись истории синхронизаций LAMA для tab «История» в /integrations/lama. */
export interface LamaSyncEvent {
  id: string;
  occurred_at: string;
  /** SCHEDULED — ночная авто-синхр.; MANUAL — кнопка «Синхронизировать сейчас». */
  trigger: "SCHEDULED" | "MANUAL";
  status: "SUCCESS" | "ERROR" | "PARTIAL";
  duration_ms: number;
  records_synced: number;
  error_message?: string;
  triggered_by_name?: string;
}

/** Запись Excel-импорта для tab «История импортов». */
export interface ExcelImportEvent {
  id: string;
  uploaded_at: string;
  uploaded_by_name: string;
  file_name: string;
  type: "EMPLOYEES" | "SCHEDULE" | "STORES";
  status: "SUCCESS" | "ERROR" | "PARTIAL";
  records_processed: number;
  records_failed: number;
  error_summary?: string;
}

// ═══════════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get current integrations status overview.
 * @endpoint GET /integrations/status
 */
export async function getIntegrationsStatus(): Promise<ApiResponse<IntegrationsStatus>> {
  await delay(350);
  return {
    data: {
      lama: {
        connected: true,
        last_sync_at: new Date("2026-04-28T06:00:00Z").toISOString(),
        shifts_synced_count: 1482,
        users_synced_count: 47,
        stores_synced_count: 8,
        health: "connected",
      },
      excel: {
        last_upload_at: new Date("2026-04-27T18:42:00Z").toISOString(),
        last_upload_type: "SCHEDULE",
        last_upload_status: "SUCCESS",
        monthly_imports_count: 8,
        last_upload_by_name: "Иванова М. П.",
      },
      webhooks: {
        total: 3,
        active: 2,
        failing: 1,
        delivered_today: 1247,
      },
      api_keys_count: 5,
      api_requests_today: 8421,
    },
  };
}

/**
 * Force LAMA sync for all stores in the organization.
 * @endpoint POST /integrations/lama/sync
 */
export async function syncLamaForce(): Promise<ApiMutationResponse> {
  await delay(600);
  console.log("[v0] Triggered force LAMA sync");
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// EXCEL UPLOAD
// ═══════════════════════════════════════════════════════════════════

/**
 * Upload an Excel file for bulk import of employees, schedule, or stores.
 * @endpoint POST /integrations/excel/upload
 */
export async function uploadExcel(
  file: File,
  type: "EMPLOYEES" | "SCHEDULE" | "STORES"
): Promise<ApiMutationResponse> {
  await delay(800);
  console.log("[v0] Uploaded Excel:", file.name, "type:", type, "size:", file.size);
  return { success: true, id: `import-${Date.now()}` };
}

// ═══════════════════════════════════════════════════════════════════
// WEBHOOKS
// ═══════════════════════════════════════════════════════════════════

const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: "wh-001",
    name: "LAMA → WFM смены",
    url: "https://api.spar-sibir.ru/wfm/webhooks/lama",
    events: ["shift.opened", "shift.closed"],
    active: true,
    last_triggered_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    failure_count: 0,
    created_at: "2026-01-15T09:00:00+07:00",
  },
  {
    id: "wh-002",
    name: "Уведомления в Telegram",
    url: "https://notify.spar-sibir.ru/telegram/tasks",
    events: ["task.completed", "task.approved", "task.rejected"],
    active: true,
    last_triggered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    failure_count: 0,
    created_at: "2026-02-01T09:00:00+07:00",
  },
  {
    id: "wh-003",
    name: "BI-система отчётность",
    url: "https://bi.spar-sibir.ru/api/wfm-events",
    events: ["goal.activated", "goal.completed"],
    active: false,
    last_triggered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    failure_count: 3,
    created_at: "2026-03-10T09:00:00+07:00",
  },
];

/**
 * Get list of configured webhooks.
 * @endpoint GET /integrations/webhooks
 */
export async function getWebhooks(): Promise<ApiListResponse<Webhook>> {
  await delay(300);
  return { data: MOCK_WEBHOOKS, total: MOCK_WEBHOOKS.length, page: 1, page_size: 50 };
}

/**
 * Create a new webhook.
 * @endpoint POST /integrations/webhooks
 */
export async function createWebhook(data: Omit<Webhook, "id" | "created_at" | "failure_count" | "last_triggered_at">): Promise<ApiMutationResponse> {
  await delay(400);
  if (!data.url || !data.events.length) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "URL and at least one event are required" } };
  }
  const newId = `wh-${Date.now()}`;
  console.log("[v0] Created webhook:", newId, data);
  return { success: true, id: newId };
}

/**
 * Update an existing webhook.
 * @endpoint PATCH /integrations/webhooks/:id
 */
export async function updateWebhook(id: string, data: Partial<Webhook>): Promise<ApiMutationResponse> {
  await delay(350);
  const wh = MOCK_WEBHOOKS.find((w) => w.id === id);
  if (!wh) return { success: false, error: { code: "NOT_FOUND", message: `Webhook ${id} not found` } };
  console.log("[v0] Updated webhook:", id, data);
  return { success: true };
}

/**
 * Delete a webhook.
 * @endpoint DELETE /integrations/webhooks/:id
 */
export async function deleteWebhook(id: string): Promise<ApiMutationResponse> {
  await delay(350);
  console.log("[v0] Deleted webhook:", id);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// LAMA SYNC HISTORY (chat 37)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get LAMA sync history (для tab «История» в /integrations/lama).
 * @endpoint GET /integrations/lama/history
 */
export async function getLamaSyncHistory(): Promise<ApiListResponse<LamaSyncEvent>> {
  await delay(220);
  // Mock — несколько записей.
  const data: LamaSyncEvent[] = [
    { id: "lama-1", occurred_at: "2026-04-28T06:00:00Z", trigger: "SCHEDULED", status: "SUCCESS", duration_ms: 12340, records_synced: 1482 },
    { id: "lama-2", occurred_at: "2026-04-27T18:42:00Z", trigger: "MANUAL", status: "SUCCESS", duration_ms: 9210, records_synced: 47, triggered_by_name: "Иванова М. П." },
    { id: "lama-3", occurred_at: "2026-04-27T06:00:00Z", trigger: "SCHEDULED", status: "PARTIAL", duration_ms: 18430, records_synced: 1465, error_message: "12 employees skipped: missing position_id" },
    { id: "lama-4", occurred_at: "2026-04-26T06:00:00Z", trigger: "SCHEDULED", status: "SUCCESS", duration_ms: 10210, records_synced: 1480 },
    { id: "lama-5", occurred_at: "2026-04-25T06:00:00Z", trigger: "SCHEDULED", status: "ERROR", duration_ms: 1200, records_synced: 0, error_message: "LAMA endpoint timeout" },
  ];
  return { data, total: data.length, page: 1, page_size: 20 };
}

/**
 * Get Excel import history (для tab «История импортов»).
 * @endpoint GET /integrations/excel/history
 */
export async function getExcelImportHistory(): Promise<ApiListResponse<ExcelImportEvent>> {
  await delay(220);
  const data: ExcelImportEvent[] = [
    { id: "imp-1", uploaded_at: "2026-04-27T18:42:00Z", uploaded_by_name: "Иванова М. П.", file_name: "schedule-april.xlsx", type: "SCHEDULE", status: "SUCCESS", records_processed: 247, records_failed: 0 },
    { id: "imp-2", uploaded_at: "2026-04-22T11:15:00Z", uploaded_by_name: "Морозова Е. С.", file_name: "new-employees.csv", type: "EMPLOYEES", status: "PARTIAL", records_processed: 18, records_failed: 2, error_summary: "2 строки пропущены: некорректный phone format" },
    { id: "imp-3", uploaded_at: "2026-04-15T09:30:00Z", uploaded_by_name: "Иванова М. П.", file_name: "stores-update.xlsx", type: "STORES", status: "SUCCESS", records_processed: 8, records_failed: 0 },
  ];
  return { data, total: data.length, page: 1, page_size: 20 };
}

// ═══════════════════════════════════════════════════════════════════
// LAMA DETAIL (chat 37)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get LAMA connection configuration.
 * @endpoint GET /integrations/lama/connection
 */
export async function getLamaConnection(): Promise<ApiResponse<LamaConnection>> {
  await delay(200);
  return {
    data: {
      url: "https://lama.spar-sibir.ru/api/v3",
      api_token_masked: "lama_tok_••••••••••••••••F2A9",
      tenant_id: "spar-sibir-001",
      last_test_at: "2026-04-28T06:00:00Z",
      last_test_status: "SUCCESS",
    },
  };
}

/**
 * Test LAMA connection.
 * @endpoint POST /integrations/lama/test
 */
export async function testLamaConnection(): Promise<ApiMutationResponse> {
  await delay(1400);
  console.log("[v0] Tested LAMA connection");
  return { success: true };
}

/**
 * Update LAMA connection config.
 * @endpoint PATCH /integrations/lama/connection
 */
export async function updateLamaConnection(data: Partial<LamaConnection>): Promise<ApiMutationResponse> {
  await delay(400);
  console.log("[v0] Updated LAMA connection:", data);
  return { success: true };
}

/**
 * Get LAMA field mapping.
 * @endpoint GET /integrations/lama/mapping/:entity
 */
export async function getLamaMapping(entity: "users" | "stores" | "positions"): Promise<ApiListResponse<LamaMappingRow>> {
  await delay(200);
  const base: LamaMappingRow[] = entity === "users" ? [
    { id: "m-u-1", lama_field: "employee_id", wfm_field: "external_id", transform: "trim", required: true },
    { id: "m-u-2", lama_field: "full_name", wfm_field: "last_name", transform: "trim", required: true },
    { id: "m-u-3", lama_field: "phone_number", wfm_field: "phone", transform: "trim", required: true },
    { id: "m-u-4", lama_field: "position_code", wfm_field: "position_name", transform: "none", required: false },
    { id: "m-u-5", lama_field: "store_code", wfm_field: "store_id", transform: "none", required: true },
  ] : entity === "stores" ? [
    { id: "m-s-1", lama_field: "store_id", wfm_field: "external_code", transform: "trim", required: true },
    { id: "m-s-2", lama_field: "store_name", wfm_field: "name", transform: "trim", required: true },
    { id: "m-s-3", lama_field: "address", wfm_field: "address", transform: "none", required: false },
    { id: "m-s-4", lama_field: "city", wfm_field: "city", transform: "none", required: false },
  ] : [
    { id: "m-p-1", lama_field: "position_code", wfm_field: "code", transform: "lowercase", required: true },
    { id: "m-p-2", lama_field: "position_name", wfm_field: "name", transform: "none", required: true },
    { id: "m-p-3", lama_field: "rank_level", wfm_field: "default_rank", transform: "none", required: false },
  ];
  return { data: base, total: base.length, page: 1, page_size: 50 };
}

/**
 * Save LAMA field mapping.
 * @endpoint PUT /integrations/lama/mapping/:entity
 */
export async function saveLamaMapping(entity: string, rows: LamaMappingRow[]): Promise<ApiMutationResponse> {
  await delay(400);
  console.log("[v0] Saved LAMA mapping:", entity, rows.length, "rows");
  return { success: true };
}

/**
 * Get LAMA sync schedule config.
 * @endpoint GET /integrations/lama/schedule
 */
export async function getLamaSchedule(): Promise<ApiResponse<LamaScheduleConfig>> {
  await delay(200);
  return {
    data: {
      enabled: true,
      frequency: "daily",
      cron_expression: "0 6 * * *",
      timezone: "Asia/Tomsk",
      notify_on_error: true,
      notify_on_success: false,
      recipients: ["admin@spar-sibir.ru", "ops@spar-sibir.ru"],
    },
  };
}

/**
 * Save LAMA sync schedule config.
 * @endpoint PUT /integrations/lama/schedule
 */
export async function saveLamaSchedule(config: LamaScheduleConfig): Promise<ApiMutationResponse> {
  await delay(350);
  console.log("[v0] Saved LAMA schedule:", config);
  return { success: true };
}

const MOCK_LAMA_LOGS: LamaSyncLog[] = [
  { id: "log-01", started_at: "2026-04-28T06:00:00Z", ended_at: "2026-04-28T06:00:12Z", trigger: "SCHEDULED", type: "FULL", status: "SUCCESS", duration_ms: 12340, records_created: 5, records_updated: 1477, error_count: 0, payload_json: { lama_version: "3.2.1", entities: ["users", "stores", "shifts"] } },
  { id: "log-02", started_at: "2026-04-27T18:42:00Z", ended_at: "2026-04-27T18:42:09Z", trigger: "MANUAL", type: "FORCE", status: "SUCCESS", duration_ms: 9210, records_created: 2, records_updated: 45, error_count: 0, initiator_name: "Иванова М. П.", payload_json: { forced_entities: ["users"] } },
  { id: "log-03", started_at: "2026-04-27T06:00:00Z", ended_at: "2026-04-27T06:00:18Z", trigger: "SCHEDULED", type: "FULL", status: "PARTIAL", duration_ms: 18430, records_created: 0, records_updated: 1465, error_count: 12, error_message: "12 employees skipped: missing position_id", error_details: ["row 14: employee E-00345 — position_id is null", "row 27: employee E-00558 — position_id is null", "row 41: employee E-00721 — position_id is null", "…and 9 more"] },
  { id: "log-04", started_at: "2026-04-26T06:00:00Z", ended_at: "2026-04-26T06:00:10Z", trigger: "SCHEDULED", type: "FULL", status: "SUCCESS", duration_ms: 10210, records_created: 1, records_updated: 1479, error_count: 0 },
  { id: "log-05", started_at: "2026-04-25T06:00:00Z", ended_at: "2026-04-25T06:00:01Z", trigger: "SCHEDULED", type: "FULL", status: "ERROR", duration_ms: 1200, records_created: 0, records_updated: 0, error_count: 1, error_message: "LAMA endpoint timeout after 30s", error_details: ["GET https://lama.spar-sibir.ru/api/v3/shifts?page=1 → timeout (30002ms)"] },
  { id: "log-06", started_at: "2026-04-24T06:00:00Z", ended_at: "2026-04-24T06:00:11Z", trigger: "SCHEDULED", type: "FULL", status: "SUCCESS", duration_ms: 11340, records_created: 3, records_updated: 1476, error_count: 0 },
  { id: "log-07", started_at: "2026-04-23T06:00:00Z", ended_at: "2026-04-23T06:00:09Z", trigger: "SCHEDULED", type: "FULL", status: "SUCCESS", duration_ms: 9870, records_created: 0, records_updated: 1480, error_count: 0 },
  { id: "log-08", started_at: "2026-04-22T14:30:00Z", ended_at: "2026-04-22T14:30:08Z", trigger: "MANUAL", type: "FORCE", status: "SUCCESS", duration_ms: 8120, records_created: 7, records_updated: 40, error_count: 0, initiator_name: "Иванова М. П." },
  { id: "log-09", started_at: "2026-04-22T06:00:00Z", ended_at: "2026-04-22T06:00:10Z", trigger: "SCHEDULED", type: "FULL", status: "SUCCESS", duration_ms: 10450, records_created: 0, records_updated: 1470, error_count: 0 },
  { id: "log-10", started_at: "2026-04-21T06:00:00Z", ended_at: "2026-04-21T06:00:15Z", trigger: "SCHEDULED", type: "FULL", status: "PARTIAL", duration_ms: 15200, records_created: 2, records_updated: 1450, error_count: 3, error_message: "3 stores skipped: name is empty" },
  { id: "log-11", started_at: "2026-04-20T06:00:00Z", ended_at: "2026-04-20T06:00:09Z", trigger: "SCHEDULED", type: "FULL", status: "SUCCESS", duration_ms: 9100, records_created: 0, records_updated: 1482, error_count: 0 },
  { id: "log-12", started_at: "2026-04-19T06:00:00Z", ended_at: "2026-04-19T06:00:08Z", trigger: "SCHEDULED", type: "INCREMENTAL", status: "SUCCESS", duration_ms: 7800, records_created: 0, records_updated: 50, error_count: 0 },
];

/**
 * Get LAMA detailed sync logs for Logs tab.
 * @endpoint GET /integrations/lama/logs
 */
export async function getLamaSyncLogs(params?: {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<ApiListResponse<LamaSyncLog>> {
  await delay(250);
  let filtered = [...MOCK_LAMA_LOGS];
  if (params?.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter((l) =>
      l.error_message?.toLowerCase().includes(s) ||
      l.initiator_name?.toLowerCase().includes(s) ||
      l.type.toLowerCase().includes(s)
    );
  }
  if (params?.status && params.status !== "all") {
    filtered = filtered.filter((l) => l.status === params.status?.toUpperCase());
  }
  const page = params?.page ?? 1;
  const page_size = params?.page_size ?? 10;
  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * page_size, page * page_size);
  return { data: paginated, total, page, page_size };
}
