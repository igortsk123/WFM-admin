/**
 * Reports API — KPI, Plan/Fact, Store Comparison, and exports.
 * All report data is static mock — no real analytics backend.
 */

import type { ApiResponse } from "@/lib/types";
import {
  MOCK_KPI_NETWORK,
  MOCK_KPI_STORE_1,
  MOCK_KPI_STORE_4,
  MOCK_KPI_STORE_7,
  type KpiReport,
} from "@/lib/mock-data/reports-kpi";
import { MOCK_PLAN_FACT, type PlanFactSummary } from "@/lib/mock-data/reports-plan-fact";
import { MOCK_STORE_COMPARE, type StoreCompareReport } from "@/lib/mock-data/reports-compare";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type ReportPeriod = "week" | "month" | "quarter" | "year" | "custom";

export interface ReportParams {
  store_id?: number;
  period: ReportPeriod;
  from?: string;
  to?: string;
}

export type { KpiReport as KpiReportData, PlanFactSummary as PlanFactReportData, StoreCompareReport as StoreCompareReportData };

// ═══════════════════════════════════════════════════════════════════
// KPI REPORT
// ═══════════════════════════════════════════════════════════════════

/**
 * Get KPI report for a store or the whole network.
 * @endpoint GET /reports/kpi
 */
export async function getKpiReport(params: ReportParams): Promise<ApiResponse<KpiReport>> {
  await delay(400);

  const { store_id } = params;

  let report: KpiReport;
  if (!store_id) {
    report = MOCK_KPI_NETWORK;
  } else if (store_id === 1) {
    report = MOCK_KPI_STORE_1;
  } else if (store_id === 4) {
    report = MOCK_KPI_STORE_4;
  } else if (store_id === 7) {
    report = MOCK_KPI_STORE_7;
  } else {
    // Derive a report for other stores based on network averages
    report = {
      ...MOCK_KPI_NETWORK,
      scope: "STORE",
      store_id,
      store_name: `Магазин #${store_id}`,
    };
  }

  return { data: report };
}

// ═══════════════════════════════════════════════════════════════════
// PLAN-FACT REPORT
// ═══════════════════════════════════════════════════════════════════

/**
 * Get plan vs actual breakdown for a period.
 * @endpoint GET /reports/plan-fact
 */
export async function getPlanFactReport(
  params: ReportParams
): Promise<ApiResponse<PlanFactSummary>> {
  await delay(450);
  console.log("[v0] Plan-fact report params:", params);
  return { data: MOCK_PLAN_FACT };
}

// ═══════════════════════════════════════════════════════════════════
// STORE COMPARE REPORT
// ═══════════════════════════════════════════════════════════════════

/**
 * Get store comparison report for a period.
 * @endpoint GET /reports/compare
 */
export async function getStoreCompareReport(
  params: Omit<ReportParams, "store_id">
): Promise<ApiResponse<StoreCompareReport>> {
  await delay(400);
  console.log("[v0] Store compare report params:", params);
  return { data: MOCK_STORE_COMPARE };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

/**
 * Export a report as XLSX or CSV (returns a Blob in real backend).
 * Mock returns an empty Blob with correct MIME type.
 * @endpoint GET /reports/:type/export
 */
export async function exportReport(
  type: "kpi" | "plan-fact" | "compare",
  format: "xlsx" | "csv"
): Promise<Blob> {
  await delay(600);
  const mimeType =
    format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv";
  console.log("[v0] Exporting report:", type, format);
  return new Blob(
    [`Mock export: ${type} - ${format} - ${new Date().toISOString()}`],
    { type: mimeType }
  );
}
