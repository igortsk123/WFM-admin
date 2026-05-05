/**
 * Integrations API — LAMA planner sync, Excel uploads, webhooks, API keys, and Nominal Account.
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

// ═══════════════════════════════════════════════════════════════════
// NOMINAL ACCOUNT TYPES
// ═══════════════════════════════════════════════════════════════════

export type NominalAccountStatus = "NOT_CONNECTED" | "CONNECTED" | "ERROR";

export interface NominalAccountConfig {
  endpoint_url: string;
  api_key: string;
  client_id: string;
}

export interface NominalAccountInfo {
  status: NominalAccountStatus;
  last_transaction_status?: string;
  stats?: {
    paid_last_30d_rub: number;
    error_count: number;
    documents_generated: number;
  };
  config?: Omit<NominalAccountConfig, "api_key"> & { api_key_masked: string };
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
  };
  api_keys_count: number;
  nominal_account?: NominalAccountInfo;
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
        last_sync_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        shifts_synced_count: 47,
      },
      excel: {
        last_upload_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        last_upload_type: "EMPLOYEES",
        last_upload_status: "SUCCESS",
      },
      webhooks: {
        total: 3,
        active: 2,
        failing: 1,
      },
      api_keys_count: 4,
      nominal_account: {
        status: "CONNECTED",
        last_transaction_status: "Успешно · 04.05.2026 в 16:42",
        stats: {
          paid_last_30d_rub: 184_200,
          error_count: 1,
          documents_generated: 37,
        },
        config: {
          endpoint_url: "https://api.nominalaccount.ru/v2",
          api_key_masked: "••••••••••••5f3a",
          client_id: "spar-sibir-wfm",
        },
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// NOMINAL ACCOUNT
// ═══════════════════════════════════════════════════════════════════

/**
 * Get Nominal Account integration info.
 * @endpoint GET /integrations/nominal-account
 */
export async function getNominalAccountInfo(): Promise<ApiResponse<NominalAccountInfo>> {
  await delay(250);
  return {
    data: {
      status: "CONNECTED",
      last_transaction_status: "Успешно · 04.05.2026 в 16:42",
      stats: {
        paid_last_30d_rub: 184_200,
        error_count: 1,
        documents_generated: 37,
      },
      config: {
        endpoint_url: "https://api.nominalaccount.ru/v2",
        api_key_masked: "••••••••••••5f3a",
        client_id: "spar-sibir-wfm",
      },
    },
  };
}

/**
 * Connect / update Nominal Account integration.
 * @endpoint POST /integrations/nominal-account
 */
export async function connectNominalAccount(
  config: NominalAccountConfig
): Promise<ApiMutationResponse> {
  await delay(600);
  if (!config.endpoint_url || !config.api_key || !config.client_id) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Все поля обязательны" } };
  }
  console.log("[v0] Connected NominalAccount:", config.endpoint_url, config.client_id);
  return { success: true };
}

/**
 * Disconnect Nominal Account integration.
 * @endpoint DELETE /integrations/nominal-account
 */
export async function disconnectNominalAccount(): Promise<ApiMutationResponse> {
  await delay(400);
  console.log("[v0] Disconnected NominalAccount");
  return { success: true };
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
