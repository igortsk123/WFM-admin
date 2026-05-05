/**
 * Organization Settings API — config management for /settings/organization screen.
 * Foundation for chat 36 (settings-organization).
 */

import type {
  ApiResponse,
  ApiMutationResponse,
  Organization,
  LegalEntity,
} from "@/lib/types";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";
import { MOCK_LEGAL_ENTITIES } from "@/lib/mock-data/legal-entities";

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
 * Get legal entities for organization.
 * @endpoint GET /organizations/:id/legal-entities
 */
export async function getLegalEntities(orgId: string): Promise<ApiResponse<LegalEntity[]>> {
  await delay(200);
  const entities = MOCK_LEGAL_ENTITIES.filter((e) => e.organization_id === orgId);
  console.log(`[v0] getLegalEntities org=${orgId}: ${entities.length} entities`);
  return { data: entities };
}

/**
 * Add new legal entity.
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

// ═══════════════════════════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════════════════════════

export type ApiKeyScope =
  | "tasks:read"
  | "tasks:write"
  | "users:read"
  | "shifts:read"
  | "reports:read";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  created_by_user_id: number;
}

export interface CreateApiKeyPayload {
  name: string;
  scopes: ApiKeyScope[];
  expires_at?: string;
}

const MOCK_API_KEYS: ApiKey[] = [
  {
    id: "key-1",
    name: "Интеграция LAMA prod",
    prefix: "wfm_live_a1b2",
    scopes: ["tasks:read", "tasks:write", "shifts:read"],
    created_at: "2026-02-10T10:00:00Z",
    last_used_at: "2026-05-04T14:22:00Z",
    created_by_user_id: 3,
  },
  {
    id: "key-2",
    name: "BI Dashboard (Power BI)",
    prefix: "wfm_live_c3d4",
    scopes: ["reports:read", "shifts:read"],
    created_at: "2026-01-15T09:00:00Z",
    last_used_at: "2026-05-03T08:11:00Z",
    created_by_user_id: 3,
  },
  {
    id: "key-3",
    name: "Тест / staging",
    prefix: "wfm_test_e5f6",
    scopes: ["tasks:read", "users:read"],
    created_at: "2026-03-20T11:30:00Z",
    expires_at: "2026-06-30T23:59:59Z",
    created_by_user_id: 5,
  },
];

/**
 * Get API keys for organization.
 * @endpoint GET /organizations/:id/api-keys
 */
export async function getApiKeys(orgId: string): Promise<ApiResponse<ApiKey[]>> {
  await delay(250);
  console.log(`[v0] getApiKeys org=${orgId}`);
  return { data: MOCK_API_KEYS };
}

/**
 * Create a new API key.
 * @endpoint POST /organizations/:id/api-keys
 */
export async function createApiKey(
  orgId: string,
  payload: CreateApiKeyPayload,
): Promise<ApiMutationResponse & { key?: string; apiKey?: ApiKey }> {
  await delay(350);
  const rawKey = `wfm_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  const newKey: ApiKey = {
    id: `key-${Date.now()}`,
    name: payload.name,
    prefix: rawKey.slice(0, 14),
    scopes: payload.scopes,
    created_at: new Date().toISOString(),
    expires_at: payload.expires_at,
    created_by_user_id: 3,
  };
  MOCK_API_KEYS.unshift(newKey);
  console.log(`[v0] Created API key for org=${orgId}:`, newKey.name);
  return { success: true, key: rawKey, apiKey: newKey };
}

/**
 * Revoke an API key.
 * @endpoint DELETE /organizations/:id/api-keys/:keyId
 */
export async function revokeApiKey(
  orgId: string,
  keyId: string,
): Promise<ApiMutationResponse> {
  await delay(280);
  const idx = MOCK_API_KEYS.findIndex((k) => k.id === keyId);
  if (idx !== -1) MOCK_API_KEYS.splice(idx, 1);
  console.log(`[v0] Revoked key ${keyId} in org ${orgId}`);
  return { success: true };
}

/**
 * Rename an API key.
 * @endpoint PATCH /organizations/:id/api-keys/:keyId
 */
export async function renameApiKey(
  orgId: string,
  keyId: string,
  name: string,
): Promise<ApiMutationResponse> {
  await delay(220);
  const key = MOCK_API_KEYS.find((k) => k.id === keyId);
  if (key) key.name = name;
  console.log(`[v0] Renamed key ${keyId} → "${name}" in org ${orgId}`);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════════

export interface BillingPaymentMethod {
  type: "VISA" | "MASTERCARD" | "MIR";
  last4: string;
}

export interface BillingHistoryEntry {
  id: string;
  date: string;
  amount_rub: number;
  status: "PAID" | "PENDING" | "FAILED";
}

export interface BillingConfig {
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  price_rub: number;
  next_charge_date: string;
  stores_used: number;
  stores_limit: number;
  active_users_used: number;
  active_users_limit: number;
  tasks_this_month: number;
  payment_method?: BillingPaymentMethod;
  history: BillingHistoryEntry[];
}

const MOCK_BILLING: BillingConfig = {
  plan: "PRO",
  price_rub: 9990,
  next_charge_date: "2026-05-28",
  stores_used: 12,
  stores_limit: 50,
  active_users_used: 47,
  active_users_limit: 500,
  tasks_this_month: 3482,
  payment_method: { type: "VISA", last4: "4242" },
  history: [
    { id: "inv-1", date: "2026-04-28", amount_rub: 9990, status: "PAID" },
    { id: "inv-2", date: "2026-03-28", amount_rub: 9990, status: "PAID" },
    { id: "inv-3", date: "2026-02-28", amount_rub: 9990, status: "PAID" },
    { id: "inv-4", date: "2026-01-28", amount_rub: 9990, status: "PAID" },
    { id: "inv-5", date: "2025-12-28", amount_rub: 4990, status: "PAID" },
  ],
};

/**
 * Get billing config.
 * @endpoint GET /organizations/:id/billing
 */
export async function getBillingConfig(orgId: string): Promise<ApiResponse<BillingConfig>> {
  await delay(280);
  console.log(`[v0] getBillingConfig org=${orgId}`);
  return { data: MOCK_BILLING };
}

// ═══════════════════════════════════════════════════════════════════
// TASK POLICIES
// ═══════════════════════════════════════════════════════════════════

export interface TaskPoliciesConfig {
  acceptance_policy: "AUTO" | "MANUAL";
  requires_photo_default: boolean;
  deviation_pct: number;
  auto_accept_hours: number;
  min_reject_reason_length: number;
  require_reject_category: boolean;
}

const MOCK_TASK_POLICIES: TaskPoliciesConfig = {
  acceptance_policy: "MANUAL",
  requires_photo_default: false,
  deviation_pct: 20,
  auto_accept_hours: 24,
  min_reject_reason_length: 20,
  require_reject_category: false,
};

/**
 * Get task policies.
 * @endpoint GET /organizations/:id/task-policies
 */
export async function getTaskPolicies(orgId: string): Promise<ApiResponse<TaskPoliciesConfig>> {
  await delay(250);
  return { data: { ...MOCK_TASK_POLICIES } };
}

/**
 * Update task policies.
 * @endpoint PATCH /organizations/:id/task-policies
 */
export async function updateTaskPolicies(
  orgId: string,
  data: Partial<TaskPoliciesConfig>,
): Promise<ApiMutationResponse> {
  await delay(300);
  Object.assign(MOCK_TASK_POLICIES, data);
  console.log(`[v0] Updated task policies org=${orgId}:`, data);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// TIMEZONE / DISPLAY FORMAT
// ═══════════════════════════════════════════════════════════════════

export interface TimezoneConfig {
  timezone: string;
  date_format: "VERBOSE" | "DOT" | "ISO";
  time_format: "24H" | "12H";
  week_start: "MON" | "SUN";
}

const MOCK_TIMEZONE_CONFIG: TimezoneConfig = {
  timezone: "Asia/Tomsk",
  date_format: "DOT",
  time_format: "24H",
  week_start: "MON",
};

/**
 * Get timezone config.
 * @endpoint GET /organizations/:id/timezone
 */
export async function getTimezoneConfig(orgId: string): Promise<ApiResponse<TimezoneConfig>> {
  await delay(200);
  return { data: { ...MOCK_TIMEZONE_CONFIG } };
}

/**
 * Update timezone config.
 * @endpoint PATCH /organizations/:id/timezone
 */
export async function updateTimezoneConfig(
  orgId: string,
  data: Partial<TimezoneConfig>,
): Promise<ApiMutationResponse> {
  await delay(280);
  Object.assign(MOCK_TIMEZONE_CONFIG, data);
  console.log(`[v0] Updated timezone config org=${orgId}:`, data);
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════
// BRANDING
// ═══════════════════════════════════════════════════════════════════

export interface BrandingConfig {
  logo_url?: string;
  primary_color: string;
  theme: "LIGHT" | "SYSTEM";
}

const MOCK_BRANDING: BrandingConfig = {
  primary_color: "#7C3AED",
  theme: "LIGHT",
};

/**
 * Get branding config.
 * @endpoint GET /organizations/:id/branding
 */
export async function getBrandingConfig(orgId: string): Promise<ApiResponse<BrandingConfig>> {
  await delay(200);
  return { data: { ...MOCK_BRANDING } };
}

/**
 * Update branding config.
 * @endpoint PATCH /organizations/:id/branding
 */
export async function updateBrandingConfig(
  orgId: string,
  data: Partial<BrandingConfig>,
): Promise<ApiMutationResponse> {
  await delay(280);
  Object.assign(MOCK_BRANDING, data);
  console.log(`[v0] Updated branding org=${orgId}:`, data);
  return { success: true };
}
