/**
 * Organization Settings API — config management for /settings/organization screen.
 * Foundation for chat 36 (settings-organization).
 */

import type {
  ApiResponse,
  ApiMutationResponse,
  Organization,
} from "@/lib/types";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// AI STANDARDS — FMCG (RETAIL) variant
// ═══════════════════════════════════════════════════════════════════

/** FMCG-specific AI threshold per product group. */
export interface FmcgGroupThreshold {
  product_category_id: number;
  product_category_name: string;
  /** Норма списаний в %. */
  writeoff_norm_pct: number;
  /** Норма OOS (out-of-stock) в %. */
  oos_norm_pct: number;
  /** Контроль скоропорта — за сколько часов до конца срока годности уведомлять. */
  expiration_alert_hours: number;
}

/** Ops-level thresholds (общие для FMCG). */
export interface FmcgOpsThresholds {
  /** Среднее время выполнения для типа «Касса», мин. */
  cashier_avg_minutes: number;
  /** Допустимое отклонение факт/план в часах смены, %. */
  shift_variance_pct: number;
  /** Максимум возвратов задач от одного работника подряд (после — alert). */
  max_consecutive_rejections: number;
}

// ═══════════════════════════════════════════════════════════════════
// AI STANDARDS — Fashion variant
// ═══════════════════════════════════════════════════════════════════

/** Fashion-specific seasonal config per product type. */
export interface FashionSeasonRow {
  product_type_id: number;
  product_type_name: string;
  /** Дата начала сезона (ISO YYYY-MM-DD). */
  season_start: string;
  /** Дата пика сезона. */
  season_peak: string;
  /** Дата конца сезона. */
  season_end: string;
  /** Типичный срок продажи карточки, дней. */
  typical_sell_days: number;
}

// ═══════════════════════════════════════════════════════════════════
// EXTENDED CONFIG
// ═══════════════════════════════════════════════════════════════════

export interface BillingInfo {
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  active_users_count: number;
  next_invoice_date: string;
  next_invoice_amount_rub: number;
}

export interface LegalEntity {
  id: number;
  name: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  /** Юрисдикция: RU / UK / OTHER (для будущей экспансии). */
  tax_jurisdiction: "RU" | "UK" | "OTHER";
  companies_house?: string;
  vat_number?: string;
}

/** Public update payload for organization config. */
export interface OrganizationConfigUpdateData {
  name?: string;
  description?: string;
  contact_email?: string;
  support_phone?: string;
  website?: string;
  default_locale?: Organization["default_locale"];
  default_timezone?: string;
}

/** Full config for /settings/organization screen. */
export interface OrganizationConfig extends Organization {
  description?: string;
  contact_email?: string;
  support_phone?: string;
  website?: string;
  /** AI standards — заполнено если ai_module_enabled=true. */
  fmcg_thresholds?: FmcgGroupThreshold[];
  fmcg_ops_thresholds?: FmcgOpsThresholds;
  fashion_seasons?: FashionSeasonRow[];
  /** Billing info (только для NETWORK_OPS owner). */
  billing?: BillingInfo;
  /** Юр.лица. */
  legal_entities?: LegalEntity[];
}

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════

/**
 * Get full organization config (all 7 tabs settings).
 * @endpoint GET /organizations/:id/config
 */
export async function getOrganizationConfig(
  orgId: string,
): Promise<ApiResponse<OrganizationConfig>> {
  await delay(280);

  const org = MOCK_ORGANIZATIONS.find((o) => o.id === orgId);
  if (!org) throw new Error(`Organization ${orgId} not found`);

  // Mock extended fields. Реальный backend будет хранить отдельно.
  const isFashion = org.business_vertical === "FASHION_RETAIL";

  const fmcg_thresholds: FmcgGroupThreshold[] = isFashion ? [] : [
    { product_category_id: 1, product_category_name: "Молочка", writeoff_norm_pct: 3, oos_norm_pct: 4, expiration_alert_hours: 24 },
    { product_category_id: 2, product_category_name: "Хлеб", writeoff_norm_pct: 5, oos_norm_pct: 3, expiration_alert_hours: 12 },
    { product_category_id: 3, product_category_name: "Алкоголь", writeoff_norm_pct: 1, oos_norm_pct: 2, expiration_alert_hours: 720 },
    { product_category_id: 4, product_category_name: "Кондитерка", writeoff_norm_pct: 2, oos_norm_pct: 4, expiration_alert_hours: 168 },
    { product_category_id: 5, product_category_name: "Овощи", writeoff_norm_pct: 4, oos_norm_pct: 5, expiration_alert_hours: 48 },
  ];

  const fmcg_ops_thresholds: FmcgOpsThresholds | undefined = isFashion
    ? undefined
    : { cashier_avg_minutes: 7, shift_variance_pct: 15, max_consecutive_rejections: 3 };

  const fashion_seasons: FashionSeasonRow[] = isFashion ? [
    { product_type_id: 1, product_type_name: "Сарафан", season_start: "2026-05-01", season_peak: "2026-06-15", season_end: "2026-08-31", typical_sell_days: 60 },
    { product_type_id: 2, product_type_name: "Пальто", season_start: "2026-09-15", season_peak: "2026-10-25", season_end: "2026-12-15", typical_sell_days: 90 },
    { product_type_id: 3, product_type_name: "Купальник", season_start: "2026-04-15", season_peak: "2026-06-30", season_end: "2026-08-15", typical_sell_days: 45 },
  ] : [];

  const billing: BillingInfo = {
    plan: "PRO",
    active_users_count: 156,
    next_invoice_date: "2026-06-01",
    next_invoice_amount_rub: 89000,
  };

  const legal_entities: LegalEntity[] = [
    { id: 1, name: "ООО «СПАР Сибирь»", inn: "7017123456", kpp: "701701001", ogrn: "1027000123456", tax_jurisdiction: "RU" },
  ];

  return {
    data: {
      ...org,
      description: "Сеть продуктовых магазинов в Сибири",
      contact_email: `info@${org.id}.ru`,
      support_phone: "+7 (3822) 123-45-67",
      website: `https://${org.id}.ru`,
      fmcg_thresholds,
      fmcg_ops_thresholds,
      fashion_seasons,
      billing,
      legal_entities,
    },
  };
}

/**
 * Update organization config (Tab «Общее»).
 * @endpoint PATCH /organizations/:id/config
 */
export async function updateOrganizationConfig(
  orgId: string,
  data: OrganizationConfigUpdateData,
): Promise<ApiMutationResponse> {
  await delay(350);
  if (data.contact_email && !data.contact_email.includes("@")) {
    return { success: false, error: { code: "INVALID_EMAIL", message: "Invalid contact email" } };
  }
  console.log(`[v0] Updated org ${orgId} config:`, data);
  return { success: true };
}

/**
 * Update FMCG product-group threshold (inline-edit per row).
 * @endpoint PATCH /organizations/:id/ai-standards/fmcg-group/:product_category_id
 */
export async function updateFmcgGroupThreshold(
  orgId: string,
  data: FmcgGroupThreshold,
): Promise<ApiMutationResponse> {
  await delay(220);
  console.log(`[v0] Updated FMCG threshold for org=${orgId}:`, data);
  return { success: true };
}

/**
 * Update FMCG ops thresholds.
 * @endpoint PATCH /organizations/:id/ai-standards/fmcg-ops
 */
export async function updateFmcgOpsThresholds(
  orgId: string,
  data: FmcgOpsThresholds,
): Promise<ApiMutationResponse> {
  await delay(220);
  console.log(`[v0] Updated FMCG ops thresholds for org=${orgId}:`, data);
  return { success: true };
}

/**
 * Update Fashion season config (inline-edit per row).
 * @endpoint PATCH /organizations/:id/ai-standards/fashion-season/:product_type_id
 */
export async function updateFashionSeason(
  orgId: string,
  data: FashionSeasonRow,
): Promise<ApiMutationResponse> {
  await delay(220);
  console.log(`[v0] Updated fashion season for org=${orgId}:`, data);
  return { success: true };
}

/**
 * Add new legal entity to organization.
 * @endpoint POST /organizations/:id/legal-entities
 */
export async function addLegalEntity(
  orgId: string,
  data: Omit<LegalEntity, "id">,
): Promise<ApiMutationResponse> {
  await delay(280);
  if (!data.name) return { success: false, error: { code: "EMPTY_NAME", message: "Name required" } };
  const newId = Date.now();
  console.log(`[v0] Added legal entity ${newId} to org ${orgId}:`, data);
  return { success: true, id: String(newId) };
}

/**
 * Update existing legal entity.
 * @endpoint PATCH /organizations/:id/legal-entities/:legalId
 */
export async function updateLegalEntity(
  orgId: string,
  legalId: number,
  data: Partial<LegalEntity>,
): Promise<ApiMutationResponse> {
  await delay(280);
  console.log(`[v0] Updated legal ${legalId} in org ${orgId}:`, data);
  return { success: true };
}

/**
 * Remove legal entity.
 * @endpoint DELETE /organizations/:id/legal-entities/:legalId
 */
export async function removeLegalEntity(
  orgId: string,
  legalId: number,
): Promise<ApiMutationResponse> {
  await delay(280);
  console.log(`[v0] Removed legal ${legalId} from org ${orgId}`);
  return { success: true };
}
