/**
 * External HR Sync API — relevant only when organization.external_hr_enabled=true.
 * Allows NETWORK_OPS to configure and trigger sync from client's HR system.
 * Config endpoints restricted to NETWORK_OPS.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  ExternalHrSyncLog,
} from "@/lib/types";
import { MOCK_EXTERNAL_SYNC_LOGS } from "@/lib/mock-data/freelance-external-sync-logs";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function isExternalHrEnabled(): boolean {
  const org = MOCK_ORGANIZATIONS.find((o) => o.id === "org-spar");
  return org?.external_hr_enabled ?? false;
}

// Runtime mutable log list for trigger-sync side-effect
let _logs = [...MOCK_EXTERNAL_SYNC_LOGS];

export function _resetExternalHrSyncMock() {
  _logs = [...MOCK_EXTERNAL_SYNC_LOGS];
}

// ═══════════════════════════════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated sync log entries (all roles can view when external_hr_enabled).
 * @param params Pagination
 * @returns Paginated ExternalHrSyncLog list
 * @endpoint GET /freelance/external-hr/sync-logs
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, HR_MANAGER
 */
export async function getExternalHrSyncLogs(
  params: ApiListParams = {}
): Promise<ApiListResponse<ExternalHrSyncLog>> {
  await delay(rand(200, 400));

  const { page = 1, page_size = 20, sort_by = "occurred_at", sort_dir = "desc" } = params;

  const sorted = [..._logs].sort((a, b) => {
    const aVal = String(a[sort_by as keyof ExternalHrSyncLog] ?? "");
    const bVal = String(b[sort_by as keyof ExternalHrSyncLog] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = sorted.length;
  const start = (page - 1) * page_size;

  return { data: sorted.slice(start, start + page_size), total, page, page_size };
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

export interface ExternalHrConfig {
  enabled: boolean;
  endpoint?: string;
  api_key_masked?: string;
  schedule?: string;
  field_mapping?: Record<string, string>;
  last_sync_at?: string;
  last_sync_status?: "OK" | "ERROR";
}

/**
 * Get the External HR integration configuration.
 * @returns ExternalHrConfig
 * @endpoint GET /freelance/external-hr/config
 * @roles NETWORK_OPS only (all others → 403)
 */
export async function getExternalHrConfig(): Promise<ApiResponse<ExternalHrConfig>> {
  await delay(rand(200, 350));

  const lastLog = _logs[_logs.length - 1];

  return {
    data: {
      enabled: isExternalHrEnabled(),
      endpoint: "https://hr-api.spar-sibir.ru/freelance/export",
      api_key_masked: "sk-••••••••••••••••3F2A",
      schedule: "0 */6 * * *", // every 6 hours
      field_mapping: {
        external_id: "ref_id",
        phone: "mobile_phone",
        store_code: "object_code",
        work_type: "job_type",
        planned_date: "date_of_service",
        hours: "duration_hours",
      },
      last_sync_at: lastLog?.occurred_at,
      last_sync_status: lastLog
        ? lastLog.errors_count === 0
          ? "OK"
          : "ERROR"
        : undefined,
    },
  };
}

/**
 * Update the External HR integration configuration.
 * @param data endpoint, api_key, schedule, field_mapping (partial)
 * @returns Success or validation error
 * @endpoint PATCH /freelance/external-hr/config
 * @roles NETWORK_OPS only
 */
export async function updateExternalHrConfig(data: {
  endpoint?: string;
  api_key?: string;
  schedule?: string;
  field_mapping?: Record<string, string>;
}): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  if (data.endpoint && !data.endpoint.startsWith("https://")) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Endpoint должен начинаться с https://",
      },
    };
  }

  console.log("[v0] External HR config updated:", data);

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// MANUAL TRIGGER
// ═══════════════════════════════════════════════════════════════════

/**
 * Manually trigger an External HR sync (simulates 1500ms processing).
 * Creates a new sync log entry on success.
 * @returns Success with new sync log ID
 * @endpoint POST /freelance/external-hr/trigger-sync
 * @roles NETWORK_OPS
 */
export async function triggerExternalHrSync(): Promise<ApiMutationResponse> {
  await delay(1500); // simulate sync processing

  const newLogId = `sync-${Date.now()}`;
  _logs = [
    ..._logs,
    {
      id: newLogId,
      occurred_at: new Date().toISOString(),
      applications_received: Math.floor(Math.random() * 3),
      freelancers_created: Math.floor(Math.random() * 2),
      errors_count: 0,
      triggered_by: "MANUAL",
      triggered_by_user: 4,
    },
  ];

  return { success: true, id: newLogId };
}
