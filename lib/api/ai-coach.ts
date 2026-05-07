/**
 * AI Coach API — управление подсказками для типов работ.
 * Foundation для chat 49 (stretch screen). Все API — статичные mock'и.
 */

import type { ApiResponse, ApiListResponse, ApiMutationResponse } from "@/lib/types";
import { MOCK_AI_HINTS, type AIHint } from "@/lib/mock-data/future-placeholders";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type AiHintStatus = "draft" | "active" | "archived";

export interface AbTest {
  id: string;
  work_type_id: number;
  control_version: number;
  treatment_version: number;
  traffic_b_pct: number;
  started_at: string;
  ends_at: string;
  status: "running" | "completed";
  control_stats: { impressions: number; applications: number; helpful_rate: number };
  treatment_stats: { impressions: number; applications: number; helpful_rate: number };
  p_value?: number;
  significant?: boolean;
}

export interface AiHintGenerateParams {
  work_type_id: number;
  context: string;
  style: "concise" | "detailed" | "friendly";
  variants_count: number;
}

export type { AIHint };

// ═══════════════════════════════════════════════════════════════════
// HINTS CRUD
// ═══════════════════════════════════════════════════════════════════

/**
 * List all AI hints, optionally filtered by work_type_id.
 * @endpoint GET /ai-coach/hints
 */
export async function getAiHints(params?: { work_type_id?: number }): Promise<ApiListResponse<AIHint>> {
  await delay(280);
  const data = params?.work_type_id != null
    ? MOCK_AI_HINTS.filter((h) => h.work_type_id === params.work_type_id)
    : MOCK_AI_HINTS;
  return { data, total: data.length, page: 1, page_size: data.length };
}

/** @endpoint POST /ai-coach/hints */
export async function createAiHint(data: Omit<AIHint, "id" | "created_at" | "stats">): Promise<ApiMutationResponse> {
  await delay(320);
  return { success: true, id: `hint-ai-${Date.now()}` };
}

/** @endpoint PATCH /ai-coach/hints/:id */
export async function updateAiHint(id: string, data: Partial<AIHint>): Promise<ApiMutationResponse> {
  await delay(280);
  return { success: true };
}

/** @endpoint POST /ai-coach/hints/:id/activate */
export async function activateAiHint(id: string): Promise<ApiMutationResponse> {
  await delay(320);
  return { success: true };
}

/**
 * Generate hint variants via AI.
 * @endpoint POST /ai-coach/hints/generate
 */
export async function generateAiHint(params: AiHintGenerateParams): Promise<ApiResponse<{ variants: string[] }>> {
  await delay(2000);
  const { work_type_id, style, variants_count } = params;
  const stylePrefix = style === "concise" ? "Кратко: " : style === "detailed" ? "Подробно: " : "Дружелюбно: ";
  const variants = Array.from({ length: variants_count }, (_, i) =>
    `${stylePrefix}AI-сгенерированный вариант ${i + 1} для типа работ #${work_type_id}. Главное: проверить полку, фотофиксация, чек-лист.`
  );
  return { data: { variants } };
}

// ═══════════════════════════════════════════════════════════════════
// A/B TESTS
// ═══════════════════════════════════════════════════════════════════

const MOCK_AB_TEST: AbTest = {
  id: "ab-001",
  work_type_id: 4,
  control_version: 2,
  treatment_version: 3,
  traffic_b_pct: 50,
  started_at: "2026-04-18T09:00:00+07:00",
  ends_at: "2026-05-02T09:00:00+07:00",
  status: "running",
  control_stats: { impressions: 245, applications: 182, helpful_rate: 0.71 },
  treatment_stats: { impressions: 248, applications: 195, helpful_rate: 0.78 },
  p_value: 0.043,
  significant: true,
};

/** @endpoint GET /ai-coach/ab-tests?work_type_id= */
export async function getAbTest(workTypeId: number): Promise<ApiResponse<AbTest | null>> {
  await delay(220);
  const data = workTypeId === 4 ? MOCK_AB_TEST : null;
  return { data };
}

export interface CreateAbTestParams {
  work_type_id: number;
  control_version: number;
  treatment_version: number;
  traffic_b_pct: number;
  duration_days: number;
}

/** @endpoint POST /ai-coach/ab-tests */
export async function createAbTest(params: CreateAbTestParams): Promise<ApiMutationResponse> {
  await delay(380);
  return { success: true, id: `ab-${Date.now()}` };
}
