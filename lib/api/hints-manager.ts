/**
 * Hints Manager API — Excel-based bulk hint upload workflow.
 * Separate from hints.ts (CRUD) — handles the template import flow.
 */

import type { ApiResponse, ApiMutationResponse } from "@/lib/types";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type HintRowStatus = "NEW" | "DUPLICATE" | "UPDATE" | "ERROR";

export interface HintTemplateRow {
  work_type: string;
  zone: string;
  text: string;
  priority: number;
  status: HintRowStatus;
  message?: string;
}

export interface HintsParseResult {
  rows: HintTemplateRow[];
  summary: {
    total: number;
    new: number;
    duplicates: number;
    updates: number;
    errors: number;
  };
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE WORKFLOW
// ═══════════════════════════════════════════════════════════════════

/**
 * Download the blank Excel template for bulk hint import.
 * Returns a Blob with the XLSX file.
 * @endpoint GET /hints/template.xlsx
 */
export async function downloadHintsTemplate(): Promise<Blob> {
  await delay(400);
  return new Blob(
    ["Mock XLSX template: work_type | zone | text | priority"],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  );
}

/**
 * Parse an uploaded Excel file and preview changes without applying them.
 * @endpoint POST /hints/parse
 */
export async function parseHintsTemplate(
  file: File
): Promise<ApiResponse<HintsParseResult>> {
  await delay(600);


  // Static mock preview result
  const rows: HintTemplateRow[] = [
    {
      work_type: "Выкладка",
      zone: "Торговый зал",
      text: "Начинайте с дальней полки. Ротация FIFO обязательна.",
      priority: 1,
      status: "NEW",
    },
    {
      work_type: "Переоценка",
      zone: "Торговый зал",
      text: "Проверьте ценники в зоне акционных товаров перед началом.",
      priority: 2,
      status: "UPDATE",
      message: "Обновит существующую подсказку #hint-45",
    },
    {
      work_type: "Инвентаризация",
      zone: "Склад",
      text: "Сверьте остатки системы с физическим пересчётом зоны 3.",
      priority: 1,
      status: "DUPLICATE",
      message: "Идентичный текст уже есть в системе",
    },
    {
      work_type: "КСО",
      zone: "Самокассы",
      text: "",
      priority: 0,
      status: "ERROR",
      message: "Поле «Текст» не может быть пустым",
    },
    {
      work_type: "Контроль качества",
      zone: "Холодильники",
      text: "Проверьте температурный режим всех секций. Норма: −18°C для заморозки, +2°C для молочки.",
      priority: 1,
      status: "NEW",
    },
  ];

  const summary = {
    total: rows.length,
    new: rows.filter((r) => r.status === "NEW").length,
    duplicates: rows.filter((r) => r.status === "DUPLICATE").length,
    updates: rows.filter((r) => r.status === "UPDATE").length,
    errors: rows.filter((r) => r.status === "ERROR").length,
  };

  return { data: { rows, summary } };
}

/**
 * Apply a parsed Excel file — creates/updates hints in the system.
 * Errors rows are skipped; others are committed.
 * @endpoint POST /hints/apply
 */
export async function applyHintsTemplate(file: File): Promise<ApiMutationResponse> {
  await delay(800);
  return { success: true };
}
