/**
 * Freelance Service Norms API — object format × work type → normative volume and hourly rate.
 * Used for cost simulation and service records. Approved by SUPERVISOR+.
 */

import type {
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  ServiceNorm,
} from "@/lib/types";
import { MOCK_SERVICE_NORMS } from "@/lib/mock-data/freelance-service-norms";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Mutable in-memory copy
let _norms = [...MOCK_SERVICE_NORMS];

export function _resetNormsMock() {
  _norms = [...MOCK_SERVICE_NORMS];
}

// ═══════════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of service norms with optional filters.
 * @param params object_format, work_type_id, archived
 * @returns Paginated ServiceNorm list
 * @endpoint GET /service-norms
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS, OPERATOR (read-only for STORE_DIRECTOR)
 */
export async function getServiceNorms(
  params: ApiListParams & {
    object_format?: string;
    work_type_id?: number;
    archived?: boolean;
  } = {}
): Promise<ApiListResponse<ServiceNorm>> {
  await delay(rand(200, 400));

  const {
    object_format,
    work_type_id,
    archived = false,
    search,
    page = 1,
    page_size = 20,
    sort_by = "object_format",
    sort_dir = "asc",
  } = params;

  let filtered = _norms.filter((n) => n.archived === archived);

  if (object_format) {
    filtered = filtered.filter((n) => n.object_format === object_format);
  }
  if (work_type_id) {
    filtered = filtered.filter((n) => n.work_type_id === work_type_id);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.work_type_name.toLowerCase().includes(q) ||
        n.object_format.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof ServiceNorm] ?? "");
    const bVal = String(b[sort_by as keyof ServiceNorm] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;

  return { data: filtered.slice(start, start + page_size), total, page, page_size };
}

// ═══════════════════════════════════════════════════════════════════
// CREATE / UPDATE / ARCHIVE
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a new service norm.
 * @param data Partial ServiceNorm (object_format, work_type_id, normative_per_hour, unit required)
 * @returns New norm ID
 * @endpoint POST /service-norms
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS (STORE_DIRECTOR / OPERATOR → 403)
 */
export async function createServiceNorm(
  data: Partial<ServiceNorm>
): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  const { object_format, work_type_id, normative_per_hour, unit } = data;

  if (!object_format || !work_type_id || !normative_per_hour || !unit) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "object_format, work_type_id, normative_per_hour and unit are required",
      },
    };
  }

  // Check for duplicate (object_format × work_type_id) — composite key constraint
  const duplicate = _norms.find(
    (n) =>
      n.object_format === object_format &&
      n.work_type_id === work_type_id &&
      !n.archived
  );
  if (duplicate) {
    return {
      success: false,
      error: {
        code: "DUPLICATE",
        message: `Норматив для формата «${object_format}» и типа работ #${work_type_id} уже существует`,
      },
    };
  }

  if (normative_per_hour <= 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "normative_per_hour must be > 0" },
    };
  }

  const newId = `sn-${Date.now()}`;
  _norms = [
    ..._norms,
    {
      id: newId,
      object_format: data.object_format!,
      work_type_id: data.work_type_id!,
      work_type_name: data.work_type_name ?? `Тип работ #${work_type_id}`,
      normative_per_hour,
      unit,
      hourly_rate: data.hourly_rate ?? null,
      currency: data.currency ?? "RUB",
      approved_by: 4,
      approved_by_name: "Романов И. А.",
      approved_at: new Date().toISOString(),
      archived: false,
    },
  ];

  return { success: true, id: newId };
}

/**
 * Update an existing service norm.
 * @param id ServiceNorm ID
 * @param data Fields to update
 * @returns Success or not found
 * @endpoint PATCH /service-norms/:id
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function updateServiceNorm(
  id: string,
  data: Partial<ServiceNorm>
): Promise<ApiMutationResponse> {
  await delay(rand(250, 450));

  const norm = _norms.find((n) => n.id === id);
  if (!norm) {
    return { success: false, error: { code: "NOT_FOUND", message: `ServiceNorm ${id} not found` } };
  }
  if (norm.archived) {
    return {
      success: false,
      error: { code: "ARCHIVED", message: "Cannot update an archived service norm" },
    };
  }

  if (data.normative_per_hour !== undefined && data.normative_per_hour <= 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "normative_per_hour must be > 0" },
    };
  }

  _norms = _norms.map((n) =>
    n.id === id
      ? {
          ...n,
          ...data,
          id,
          approved_at: new Date().toISOString(),
          approved_by: 4,
          approved_by_name: "Романов И. А.",
        }
      : n
  );

  return { success: true };
}

/**
 * Archive a service norm (soft delete, never hard delete).
 * @param id ServiceNorm ID
 * @returns Success or not found
 * @endpoint POST /service-norms/:id/archive
 * @roles SUPERVISOR, REGIONAL, NETWORK_OPS
 */
export async function archiveServiceNorm(id: string): Promise<ApiMutationResponse> {
  await delay(rand(200, 350));

  const norm = _norms.find((n) => n.id === id);
  if (!norm) {
    return { success: false, error: { code: "NOT_FOUND", message: `ServiceNorm ${id} not found` } };
  }
  if (norm.archived) {
    return {
      success: false,
      error: { code: "ALREADY_ARCHIVED", message: "Service norm is already archived" },
    };
  }

  _norms = _norms.map((n) => (n.id === id ? { ...n, archived: true } : n));

  return { success: true };
}
