import type { NetworkHealthSummary, StoreHealthRow, FormatHealthRow } from "@/lib/types";

/**
 * Mock данные для вкладки "Здоровье сети" дашборда (SUPERVISOR+).
 * Прогноз часов vs реально назначено по магазинам сети.
 *
 * Источник:
 * - forecast_hours = плановые часы из shifts_plan + AI-корректировка по аномалиям
 * - assigned_hours = факт назначений (shifts_fact + freelance_assignments)
 * - coverage_pct_diff = (assigned/forecast в этом периоде) vs (assigned/forecast в прошлом)
 */

const STORES_HEALTH: StoreHealthRow[] = [
  {
    store_id: 8,
    store_name: "FC Томск, ул. Учебная 39",
    format: "SUPERMARKET",
    forecast_hours: 56,
    assigned_hours: 23,
    coverage_pct_diff: 2,
    status: "ANOMALY",
    anomaly_pct: 50,
    supervisor_id: 3,
    supervisor_name: "Степанов С. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 2,
    store_name: "СПАР Томск, ул. Красноармейская 99",
    format: "CONVENIENCE",
    forecast_hours: 50,
    assigned_hours: 0,
    coverage_pct_diff: -12,
    status: "IDLE",
    supervisor_id: 3,
    supervisor_name: "Иванов И. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 3,
    store_name: "СПАР Томск, пр. Фрунзе 92а",
    format: "CONVENIENCE",
    forecast_hours: 59,
    assigned_hours: 118,
    coverage_pct_diff: 20,
    status: "ANOMALY",
    anomaly_pct: 200,
    supervisor_id: 3,
    supervisor_name: "Леонтьев Н. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    format: "SUPERMARKET",
    forecast_hours: 110,
    assigned_hours: 102,
    coverage_pct_diff: 8,
    status: "NORMAL",
    supervisor_id: 3,
    supervisor_name: "Иванов И. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 7,
    store_name: "FC Томск Global Market, пр. Ленина 217",
    format: "HYPERMARKET",
    forecast_hours: 142,
    assigned_hours: 128,
    coverage_pct_diff: 4,
    status: "NORMAL",
    supervisor_id: 3,
    supervisor_name: "Степанов С. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 9,
    store_name: "FC Томск, ул. Иркутский тракт 122",
    format: "CONVENIENCE",
    forecast_hours: 64,
    assigned_hours: 58,
    coverage_pct_diff: 12,
    status: "NORMAL",
    supervisor_id: 3,
    supervisor_name: "Степанов С. И.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    format: "SUPERMARKET",
    forecast_hours: 88,
    assigned_hours: 80,
    coverage_pct_diff: -2,
    status: "NORMAL",
    supervisor_id: 4,
    supervisor_name: "Соколов А. В.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 5,
    store_name: "СПАР Новосибирск, Красный пр. 200",
    format: "HYPERMARKET",
    forecast_hours: 134,
    assigned_hours: 121,
    coverage_pct_diff: 6,
    status: "NORMAL",
    supervisor_id: 4,
    supervisor_name: "Соколов А. В.",
    supervisor_avatar_url: null,
  },
  {
    store_id: 6,
    store_name: "СПАР Кемерово, пр. Советский 50",
    format: "SMALL_SHOP",
    forecast_hours: 38,
    assigned_hours: 22,
    coverage_pct_diff: -8,
    status: "IDLE",
    supervisor_id: 4,
    supervisor_name: "Соколов А. В.",
    supervisor_avatar_url: null,
  },
];

const FORMAT_HEALTH: FormatHealthRow[] = [
  { format: "CONVENIENCE", diff_pct: -12 },
  { format: "SUPERMARKET", diff_pct: 19 },
  { format: "HYPERMARKET", diff_pct: 2 },
  { format: "SMALL_SHOP", diff_pct: -2 },
];

export const MOCK_NETWORK_HEALTH: NetworkHealthSummary = {
  score: 58,
  period: "current_month",
  trend_7d: {
    coverage_pct_diff: 5,
    anomalies_diff_count: -1,
  },
  by_format: FORMAT_HEALTH,
  stores: STORES_HEALTH,
};
