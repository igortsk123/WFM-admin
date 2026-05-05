/**
 * Regulations API — document management for AI context and worker reference.
 * Documents are archive-only (never deleted).
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  Regulation,
} from "@/lib/types";
import { MOCK_REGULATIONS } from "@/lib/mock-data/regulations";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface RegulationDetail extends Regulation {
  usage_history: Array<{
    occurred_at: string;
    user_id: number;
    work_type_id: number;
    task_id?: string;
  }>;
  usage_chart_90d: number[];
}

/** Filter params для regulations list (chat 33b). */
export interface RegulationListParams extends ApiListParams {
  search?: string;
  /** Multi-фильтр по типам работ (тегам). */
  work_type_ids?: number[];
  /** Multi-фильтр по зонам (тегам). */
  zone_ids?: number[];
  /** Single legacy work_type_id. */
  work_type_id?: number;
  /** Single legacy zone_id. */
  zone_id?: number;
  /** ID кто загрузил. */
  uploaded_by_user_id?: number;
  /** Архивные / активные. По умолчанию false. */
  is_archived?: boolean;
  /** Только без тегов (untagged) — для filter-chip «Без тегов». */
  untagged_only?: boolean;
}

/** Aggregated stats для KpiCards на regulations screen. */
export interface RegulationsStats {
  total_count: number;
  ai_uses_7d: number;
  ai_uses_chart_30d: number[];
  untagged_count: number;
}

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/**
 * Get paginated list of regulations / documents.
 * @endpoint GET /regulations
 */
export async function getRegulations(
  params: RegulationListParams = {}
): Promise<ApiListResponse<Regulation>> {
  await delay(300);

  const {
    work_type_id,
    work_type_ids,
    zone_id,
    zone_ids,
    uploaded_by_user_id,
    is_archived = false,
    untagged_only,
    search,
    page = 1,
    page_size = 20,
    sort_by = "uploaded_at",
    sort_dir = "desc",
  } = params;

  let filtered = MOCK_REGULATIONS.filter((r) => r.is_archived === is_archived);

  // Multi-фильтр по work_types (matches if regulation tag is in any of requested ids).
  const effectiveWtIds = work_type_ids && work_type_ids.length > 0
    ? work_type_ids
    : (work_type_id ? [work_type_id] : null);
  if (effectiveWtIds) {
    filtered = filtered.filter((r) =>
      r.work_type_ids?.some((wid) => effectiveWtIds.includes(wid)),
    );
  }

  const effectiveZoneIds = zone_ids && zone_ids.length > 0
    ? zone_ids
    : (zone_id ? [zone_id] : null);
  if (effectiveZoneIds) {
    filtered = filtered.filter((r) =>
      r.zone_ids?.some((zid) => effectiveZoneIds.includes(zid)),
    );
  }

  if (uploaded_by_user_id) {
    filtered = filtered.filter((r) => r.uploaded_by === uploaded_by_user_id);
  }

  if (untagged_only) {
    filtered = filtered.filter(
      (r) => (!r.work_type_ids || r.work_type_ids.length === 0) && (!r.zone_ids || r.zone_ids.length === 0),
    );
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }

  filtered.sort((a, b) => {
    const aVal = String(a[sort_by as keyof Regulation] ?? "");
    const bVal = String(b[sort_by as keyof Regulation] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const data = filtered.slice((page - 1) * page_size, page * page_size);

  return { data, total, page, page_size };
}

/**
 * Get aggregated stats for regulations screen (KpiCards).
 * @endpoint GET /regulations/stats
 */
export async function getRegulationsStats(): Promise<ApiResponse<RegulationsStats>> {
  await delay(200);
  const active = MOCK_REGULATIONS.filter((r) => !r.is_archived);
  const total_count = active.length;
  const untagged_count = active.filter(
    (r) => (!r.work_type_ids || r.work_type_ids.length === 0) && (!r.zone_ids || r.zone_ids.length === 0),
  ).length;
  // Mock-телеметрия: AI usage за неделю + 30-day sparkline (детерминированные)
  const ai_uses_7d = 142;
  const ai_uses_chart_30d = Array.from({ length: 30 }, (_, i) => 80 + ((i * 7) % 30) + Math.floor(i / 4));
  return {
    data: { total_count, ai_uses_7d, ai_uses_chart_30d, untagged_count },
  };
}

/**
 * Get a single regulation with usage history and 90-day chart.
 * @endpoint GET /regulations/:id
 */
export async function getRegulationById(id: string): Promise<ApiResponse<RegulationDetail>> {
  await delay(350);

  const reg = MOCK_REGULATIONS.find((r) => r.id === id);
  if (!reg) throw new Error(`Regulation ${id} not found`);

  // Static mock usage history
  const usage_history = Array.from({ length: 5 }, (_, i) => ({
    occurred_at: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: 15 + i,
    work_type_id: reg.work_type_ids?.[0] ?? 4,
    task_id: i % 2 === 0 ? `task-${10 + i}` : undefined,
  }));

  // 90-day usage sparkline (decreasing trend for archived, stable/increasing for active)
  const usage_chart_90d = Array.from({ length: 90 }, (_, i) => {
    const base = reg.ai_usage_count_30d / 30;
    return Math.max(0, Math.round(base + (Math.random() * 1.5 - 0.5)));
  });

  return { data: { ...reg, usage_history, usage_chart_90d } };
}

// ═══════════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════════

/**
 * Upload a new regulation document (multipart/form-data in real backend).
 * @endpoint POST /regulations
 */
export async function uploadRegulation(
  file: File,
  meta: {
    name: string;
    description?: string;
    work_type_ids?: number[];
    zone_ids?: number[];
    replaces_id?: string;
  }
): Promise<ApiMutationResponse> {
  await delay(700);

  if (!meta.name) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Document name is required" } };
  }
  if (!file.name) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "File is required" } };
  }

  const newId = `reg-${Date.now()}`;
  console.log("[v0] Uploaded regulation:", newId, file.name, meta);
  return { success: true, id: newId };
}

/**
 * Update regulation metadata (not the file — upload new version via uploadRegulation).
 * @endpoint PATCH /regulations/:id
 */
export async function updateRegulation(
  id: string,
  data: Partial<Regulation>
): Promise<ApiMutationResponse> {
  await delay(350);
  const reg = MOCK_REGULATIONS.find((r) => r.id === id);
  if (!reg) return { success: false, error: { code: "NOT_FOUND", message: `Regulation ${id} not found` } };
  console.log("[v0] Updated regulation:", id, data);
  return { success: true };
}

/**
 * Archive a regulation (archive-only — not deleted).
 * @endpoint POST /regulations/:id/archive
 */
export async function archiveRegulation(id: string): Promise<ApiMutationResponse> {
  await delay(350);
  const reg = MOCK_REGULATIONS.find((r) => r.id === id);
  if (!reg) return { success: false, error: { code: "NOT_FOUND", message: `Regulation ${id} not found` } };
  if (reg.is_archived) return { success: false, error: { code: "ALREADY_ARCHIVED", message: "Already archived" } };
  console.log("[v0] Archived regulation:", id);
  return { success: true };
}

/**
 * Download a regulation file as a Blob.
 * @endpoint GET /regulations/:id/download
 */
export async function downloadRegulation(id: string): Promise<Blob> {
  await delay(500);
  const reg = MOCK_REGULATIONS.find((r) => r.id === id);
  if (!reg) throw new Error(`Regulation ${id} not found`);

  const mimeType = reg.file_type === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  console.log("[v0] Downloading regulation:", id, reg.name);
  return new Blob(
    [`Mock file content for: ${reg.name}`],
    { type: mimeType }
  );
}
