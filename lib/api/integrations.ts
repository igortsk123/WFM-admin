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
    error?: string;
  };
  excel: {
    last_upload_at?: string;
    last_upload_type?: "EMPLOYEES" | "SCHEDULE" | "STORES";
    last_upload_status?: "SUCCESS" | "ERROR" | "PARTIAL";
  };
  webhooks: {
    total: number;
    active: number;
    failing: number;
  };
  api_keys_count: number;
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
