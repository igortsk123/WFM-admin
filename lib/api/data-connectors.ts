/**
 * Data Connectors API — external system integrations (POS, LAMA/Planner, etc.).
 * LAMA is the first-client PLANNER; the architecture is generic for any planner.
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  DataConnector,
  DataConnectorType,
} from "@/lib/types";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA (inline — no separate mock file for connectors)
// ═══════════════════════════════════════════════════════════════════

const now = new Date("2026-05-01T10:00:00+07:00");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

const MOCK_DATA_CONNECTORS: DataConnector[] = [
  {
    id: "dc-001",
    type: "PLANNER",
    name: "LAMA — СПАР Сибирь",
    status: "ACTIVE",
    config: { host: "lama.spar-sibir.ru", port: 443, timeout_sec: 30 },
    stats: {
      records_per_day: 47,
      last_sync_at: hoursAgo(2),
      total_records: 1240,
    },
    organization_id: "org-lama",
    scope: { store_ids: [1, 2, 3, 4, 5, 6] },
  },
  {
    id: "dc-002",
    type: "POS",
    name: "POS СПАР Томск — касса",
    status: "ACTIVE",
    config: { provider: "DATECS", api_url: "https://pos.spar-tom.ru/api" },
    stats: {
      records_per_day: 124567,
      last_sync_at: hoursAgo(0.25),
      total_records: 3_200_000,
    },
    organization_id: "org-lama",
    scope: { store_ids: [1, 2, 3] },
  },
  {
    id: "dc-003",
    type: "INVENTORY",
    name: "WMS остатки — СПАР",
    status: "DEGRADED",
    config: { api_url: "https://wms.spar-sibir.ru/api/v2", update_interval_min: 240 },
    stats: {
      records_per_day: 8400,
      last_sync_at: daysAgo(2),
      total_records: 210000,
    },
    organization_id: "org-lama",
  },
  {
    id: "dc-004",
    type: "PROMO",
    name: "Промо-план — 1С Торговля",
    status: "CONFIGURED",
    config: { provider: "1C", version: "8.3" },
    stats: {
      records_per_day: 0,
      last_sync_at: undefined,
    },
    organization_id: "org-lama",
  },
  {
    id: "dc-005",
    type: "PLANNER",
    name: "LAMA — Food City",
    status: "ACTIVE",
    config: { host: "lama.foodcity.ru", port: 443 },
    stats: {
      records_per_day: 23,
      last_sync_at: hoursAgo(1),
      total_records: 640,
    },
    organization_id: "org-lama",
    scope: { store_ids: [7, 8] },
  },
  {
    id: "dc-006",
    type: "MARKETING_CHANNEL",
    name: "Telegram-канал распродаж Альфа",
    status: "ACTIVE",
    config: { bot_token_masked: "***masked***", channel_id: "@alfa_sales" },
    stats: {
      records_per_day: 2,
      last_sync_at: hoursAgo(6),
    },
    organization_id: "org-levas",
  },
  {
    id: "dc-007",
    type: "SUPPLY",
    name: "Поставки — EDI Сибирский Гигант",
    status: "DISCONNECTED",
    config: { edi_format: "EANCOM", provider: "Сибирский Гигант" },
    organization_id: "org-lama",
  },
];

// ═══════════════════════════════════════════════════════════════════
// LIST & CONFIGURE
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all data connectors for the organization.
 * @endpoint GET /integrations/data-connectors
 */
export async function getDataConnectors(): Promise<ApiListResponse<DataConnector>> {
  await delay(300);
  return {
    data: MOCK_DATA_CONNECTORS,
    total: MOCK_DATA_CONNECTORS.length,
    page: 1,
    page_size: 50,
  };
}

/**
 * Configure a new data connector or update an existing one.
 * @endpoint POST /integrations/data-connectors
 */
export async function configureDataConnector(
  type: DataConnectorType,
  config: Record<string, unknown>,
  scope?: { store_ids?: number[] }
): Promise<ApiResponse<DataConnector>> {
  await delay(500);

  const newConnector: DataConnector = {
    id: `dc-${Date.now()}`,
    type,
    name: `${type} connector`,
    status: "CONFIGURED",
    config,
    organization_id: "org-lama",
    scope,
  };

  console.log("[v0] Configured data connector:", newConnector.id, type);
  return { data: newConnector };
}

/**
 * Test connectivity for a data connector.
 * @endpoint POST /integrations/data-connectors/:id/test
 */
export async function testDataConnector(
  id: string
): Promise<ApiResponse<{ success: boolean; sample_data?: Record<string, unknown>; error?: string }>> {
  await delay(1200);

  const connector = MOCK_DATA_CONNECTORS.find((c) => c.id === id);
  if (!connector) throw new Error(`Data connector ${id} not found`);

  // Simulate degraded connector failure
  if (connector.status === "DISCONNECTED") {
    return {
      data: {
        success: false,
        error: "Connection refused: host unreachable",
      },
    };
  }

  if (connector.status === "DEGRADED") {
    return {
      data: {
        success: false,
        error: "Timeout after 30s — partial response received",
      },
    };
  }

  console.log("[v0] Testing data connector:", id);
  return {
    data: {
      success: true,
      sample_data: {
        connector_type: connector.type,
        records_today: connector.stats?.records_per_day ?? 0,
        last_sync: connector.stats?.last_sync_at,
      },
    },
  };
}

/**
 * Remove a data connector configuration.
 * @endpoint DELETE /integrations/data-connectors/:id
 */
export async function removeDataConnector(id: string): Promise<ApiMutationResponse> {
  await delay(400);
  const connector = MOCK_DATA_CONNECTORS.find((c) => c.id === id);
  if (!connector) return { success: false, error: { code: "NOT_FOUND", message: `Connector ${id} not found` } };
  console.log("[v0] Removed data connector:", id);
  return { success: true };
}
