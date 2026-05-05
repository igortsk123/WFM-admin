/**
 * Audit API — immutable audit trail for all system actions.
 * Read-only; audit entries are never modified or deleted.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiListParams,
  AuditEntry,
} from "@/lib/types";
import { MOCK_AUDIT_ENTRIES } from "@/lib/mock-data/audit";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// LIST & GET
// ═══════════════════════════════════════════════════════════════════

/** Filter params для audit list (chat 38). */
export interface AuditListParams extends ApiListParams {
  search?: string;
  actor_id?: number;
  /** Multi-фильтр по entity_type ('task', 'user', 'shift', 'goal', 'webhook', 'organization', ...). */
  entity_types?: string[];
  /** Single entity_type (legacy). */
  entity_type?: string;
  /** Multi-фильтр по action кодам. */
  actions?: string[];
  /** Single action (legacy). */
  action?: string;
  date_from?: string;
  date_to?: string;
  /** Только cross-tenant действия (для PLATFORM_ADMIN). */
  platform_action_only?: boolean;
}

/**
 * Get paginated audit log with optional filters.
 * @endpoint GET /audit/list
 */
export async function getAuditEntries(
  params: AuditListParams = {}
): Promise<ApiListResponse<AuditEntry>> {
  await delay(350);

  const {
    actor_id,
    entity_type,
    entity_types,
    action,
    actions,
    date_from,
    date_to,
    platform_action_only,
    search,
    page = 1,
    page_size = 20,
    sort_by = "occurred_at",
    sort_dir = "desc",
  } = params;

  let filtered = [...MOCK_AUDIT_ENTRIES];

  if (actor_id) filtered = filtered.filter((e) => e.actor.id === actor_id);

  // Multi entity_types (предпочтение над single).
  const effectiveEntityTypes = entity_types && entity_types.length > 0
    ? entity_types
    : (entity_type ? [entity_type] : null);
  if (effectiveEntityTypes) {
    filtered = filtered.filter((e) => effectiveEntityTypes.includes(e.entity_type));
  }

  // Multi actions.
  const effectiveActions = actions && actions.length > 0
    ? actions
    : (action ? [action] : null);
  if (effectiveActions) {
    filtered = filtered.filter((e) => effectiveActions.includes(e.action));
  }

  if (date_from) filtered = filtered.filter((e) => e.occurred_at >= date_from);
  if (date_to) filtered = filtered.filter((e) => e.occurred_at <= date_to);

  if (platform_action_only) {
    // Mock-флаг — для PLATFORM_ADMIN cross-tenant audit. В реальном backend поле platform_action.
    filtered = filtered.filter((e) => (e as AuditEntry & { platform_action?: boolean }).platform_action);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.action_label.toLowerCase().includes(q) ||
        e.entity_name.toLowerCase().includes(q) ||
        e.actor.name.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    const aVal = sort_by === "occurred_at" ? a.occurred_at : String(a[sort_by as keyof AuditEntry] ?? "");
    const bVal = sort_by === "occurred_at" ? b.occurred_at : String(b[sort_by as keyof AuditEntry] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return sort_dir === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const data = filtered.slice((page - 1) * page_size, page * page_size);

  return { data, total, page, page_size };
}

/**
 * Get single audit entry by ID.
 * @endpoint GET /audit/:id
 */
export async function getAuditEntryById(id: string): Promise<ApiResponse<AuditEntry>> {
  await delay(250);
  const entry = MOCK_AUDIT_ENTRIES.find((e) => e.id === id);
  if (!entry) throw new Error(`Audit entry with ID ${id} not found`);
  return { data: entry };
}
