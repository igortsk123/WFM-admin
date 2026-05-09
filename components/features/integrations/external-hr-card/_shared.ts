import type { useTranslations } from "next-intl";

import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores";
import type { ExternalHrConfig } from "@/lib/api/external-hr-sync";

// ═══════════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════════

export type Translator = ReturnType<typeof useTranslations>;

export type ExternalHrStatus = "NOT_CONFIGURED" | "ACTIVE" | "ERROR";

export interface ExternalHrCardInfo {
  status: ExternalHrStatus;
  last_sync_at?: string;
  applications_7d: number;
  freelancers_7d: number;
  config?: ExternalHrConfig;
}

export interface MappingRow {
  id: string;
  key: string;
  storeValue: string;
  workTypeValue: string;
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULE OPTIONS
// ═══════════════════════════════════════════════════════════════════

export const SCHEDULE_OPTIONS = [
  { value: "*/15 * * * *", key: "schedule_15m" },
  { value: "0 * * * *", key: "schedule_1h" },
  { value: "0 */6 * * *", key: "schedule_6h" },
  { value: "0 0 * * *", key: "schedule_daily" },
  { value: "manual", key: "schedule_manual" },
] as const;

// ═══════════════════════════════════════════════════════════════════
// MOCK STORE / WORK TYPE options for field mapping
// ═══════════════════════════════════════════════════════════════════

export const MOCK_STORE_OPTIONS = DEMO_TOP_STORES.slice(0, 3).map((s) => ({
  value: String(s.id),
  label: s.name,
}));

export const MOCK_WORK_TYPE_OPTIONS = [
  { value: "4", label: "Выкладка" },
  { value: "6", label: "Инвентаризация" },
  { value: "2", label: "Касса" },
  { value: "13", label: "Складские работы" },
];
