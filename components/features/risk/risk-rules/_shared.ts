import type { RiskMode, RiskRuleConfig, RiskTriggerKey } from "@/lib/api/risk";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const MODE_VARIANT: Record<RiskMode, string> = {
  FULL_REVIEW: "bg-destructive/10 text-destructive border-destructive/20",
  SAMPLING: "bg-info/10 text-info border-info/20",
  PHOTO_REQUIRED: "bg-accent/15 text-accent-foreground border-accent/20",
  AUTO_ACCEPT: "bg-muted text-muted-foreground border-border",
};

export const TRIGGER_KEYS_WITH_THRESHOLD: RiskTriggerKey[] = [
  "NEW_PERFORMER",
  "STORE_HIGH_DEFECT",
  "PERFORMER_RECENT_REJECTS",
];

export const TRIGGER_DEFAULTS: Record<RiskTriggerKey, number | undefined> = {
  NEW_PERFORMER: 5,
  STORE_HIGH_DEFECT: 10,
  PERFORMER_RECENT_REJECTS: 3,
  TASK_ADDITIONAL: undefined,
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface HistoryEntry {
  id: string;
  rule_name: string;
  work_type_name: string;
  changed_at: string;
  changed_by: string;
  before: Partial<RiskRuleConfig>;
  after: Partial<RiskRuleConfig>;
}

// ═══════════════════════════════════════════════════════════════════
// MOCK HISTORY DATA
// ═══════════════════════════════════════════════════════════════════

export const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "hist-001",
    rule_name: "Контроль качества",
    work_type_name: "Контроль качества",
    changed_at: "2026-04-28T14:30:00+07:00",
    changed_by: "Романов А.В.",
    before: { mode: "FULL_REVIEW", sample_rate: undefined },
    after: { mode: "SAMPLING", sample_rate: 35 },
  },
  {
    id: "hist-002",
    rule_name: "Выкладка",
    work_type_name: "Выкладка",
    changed_at: "2026-04-25T09:15:00+07:00",
    changed_by: "Соколова И.Д.",
    before: { mode: "SAMPLING", sample_rate: 50 },
    after: { mode: "SAMPLING", sample_rate: 35 },
  },
  {
    id: "hist-003",
    rule_name: "Инвентаризация",
    work_type_name: "Инвентаризация",
    changed_at: "2026-04-20T11:00:00+07:00",
    changed_by: "Романов А.В.",
    before: { mode: "AUTO_ACCEPT" },
    after: { mode: "PHOTO_REQUIRED", photo_required: true },
  },
];
