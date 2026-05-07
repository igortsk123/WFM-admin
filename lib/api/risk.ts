/**
 * Risk Scoring API — конфигурация выборочной верификации задач.
 * Foundation для chat 50 (stretch screen). Все API — статичные mock'и.
 */

import type { ApiResponse, ApiListResponse, ApiMutationResponse } from "@/lib/types";
import { MOCK_RISK_RULES, type RiskRule } from "@/lib/mock-data/future-placeholders";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type RiskMode = "FULL_REVIEW" | "SAMPLING" | "PHOTO_REQUIRED" | "AUTO_ACCEPT";

export type RiskTriggerKey =
  | "NEW_PERFORMER"
  | "STORE_HIGH_DEFECT"
  | "PERFORMER_RECENT_REJECTS"
  | "TASK_ADDITIONAL";

export interface RiskTriggerConfig {
  key: RiskTriggerKey;
  enabled: boolean;
  threshold?: number;
}

/** Расширенный конфиг правила для UI редактора. */
export interface RiskRuleConfig extends RiskRule {
  mode: RiskMode;
  sample_rate?: number;
  photo_required: boolean;
  triggers_config: RiskTriggerConfig[];
}

export interface RiskMetrics {
  avg_review_minutes: number;
  prev_avg_review_minutes: number;
  reviewed_share_pct: number;
  prev_reviewed_share_pct: number;
  hours_saved_per_month: number;
  defect_rate_pct: number;
  trend_defect: Array<{ date: string; value: number }>;
  trend_review_time: Array<{ date: string; value: number }>;
  top_defective_work_types: Array<{ work_type_id: number; work_type_name: string; defect_rate_pct: number; tasks_count: number }>;
}

export interface RiskSimulationParams {
  date_from: string;
  date_to: string;
  store_ids?: number[];
}

export interface RiskSimulationResult {
  tasks_total: number;
  would_review: number;
  hours_saved: number;
  forecast_defect_rate_pct: number;
}

export type { RiskRule };

// ═══════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════

/** @endpoint GET /risk/rules */
export async function getRiskRules(): Promise<ApiListResponse<RiskRuleConfig>> {
  await delay(300);
  const data: RiskRuleConfig[] = MOCK_RISK_RULES.map((r, i) => ({
    ...r,
    mode: i === 0 ? "FULL_REVIEW" : i === 1 ? "SAMPLING" : i === 2 ? "PHOTO_REQUIRED" : "AUTO_ACCEPT",
    sample_rate: i === 1 ? 35 : undefined,
    photo_required: i === 0 || i === 2,
    triggers_config: [
      { key: "NEW_PERFORMER", enabled: true, threshold: 5 },
      { key: "STORE_HIGH_DEFECT", enabled: i < 2, threshold: 10 },
      { key: "PERFORMER_RECENT_REJECTS", enabled: false, threshold: 3 },
      { key: "TASK_ADDITIONAL", enabled: false },
    ],
  }));
  return { data, total: data.length, page: 1, page_size: data.length };
}

/** @endpoint PATCH /risk/rules/:id */
export async function updateRiskRule(id: string, data: Partial<RiskRuleConfig>): Promise<ApiMutationResponse> {
  await delay(280);
  return { success: true };
}

/** @endpoint POST /risk/rules */
export async function createRiskRule(data: Omit<RiskRuleConfig, "id">): Promise<ApiMutationResponse> {
  await delay(320);
  return { success: true, id: `rule-${Date.now()}` };
}

/** @endpoint DELETE /risk/rules/:id */
export async function deleteRiskRule(id: string): Promise<ApiMutationResponse> {
  await delay(220);
  return { success: true };
}

const MOCK_TREND_DEFECT = Array.from({ length: 90 }, (_, i) => ({
  date: new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  value: Math.round((2 + Math.sin(i / 10) * 0.8 + Math.random() * 0.4) * 10) / 10,
}));

const MOCK_TREND_REVIEW = Array.from({ length: 90 }, (_, i) => ({
  date: new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  value: Math.round((6.5 - i * 0.04 + Math.random() * 0.6) * 10) / 10,
}));

/** @endpoint GET /risk/metrics */
export async function getRiskMetrics(): Promise<ApiResponse<RiskMetrics>> {
  await delay(280);
  return {
    data: {
      avg_review_minutes: 3.2,
      prev_avg_review_minutes: 6.8,
      reviewed_share_pct: 42,
      prev_reviewed_share_pct: 100,
      hours_saved_per_month: 1280,
      defect_rate_pct: 2.1,
      trend_defect: MOCK_TREND_DEFECT,
      trend_review_time: MOCK_TREND_REVIEW,
      top_defective_work_types: [
        { work_type_id: 7, work_type_name: "Другие работы", defect_rate_pct: 8.4, tasks_count: 44 },
        { work_type_id: 6, work_type_name: "Инвентаризация", defect_rate_pct: 5.2, tasks_count: 67 },
        { work_type_id: 1, work_type_name: "Менеджерские операции", defect_rate_pct: 4.7, tasks_count: 52 },
        { work_type_id: 13, work_type_name: "Складские работы", defect_rate_pct: 3.9, tasks_count: 221 },
        { work_type_id: 5, work_type_name: "Переоценка", defect_rate_pct: 3.1, tasks_count: 148 },
      ],
    },
  };
}

/** @endpoint POST /risk/simulate */
export async function simulateRisk(params: RiskSimulationParams): Promise<ApiResponse<RiskSimulationResult>> {
  await delay(1500);
  return {
    data: {
      tasks_total: 1240,
      would_review: 521,
      hours_saved: 213,
      forecast_defect_rate_pct: 2.4,
    },
  };
}
