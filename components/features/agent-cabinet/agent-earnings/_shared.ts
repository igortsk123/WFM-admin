import type { AgentEarning, Locale } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────

export type EarningStatus = "CALCULATED" | "PAID";

export interface FreelancerOption {
  id: number;
  name: string;
}

// ─────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────

// Last 30 days default range
export function defaultDateFrom(): string {
  const d = new Date("2026-05-01");
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function defaultDateTo(): string {
  return "2026-05-01";
}

export function parseIsoDate(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export function toIsoDate(d: Date | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function formatShortDate(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale);
}

// ─────────────────────────────────────────────────────────────────
// CSV EXPORT
// ─────────────────────────────────────────────────────────────────

export function downloadCsv(rows: AgentEarning[], _locale: Locale) {
  const headers = [
    "id",
    "period_date",
    "freelancer_name",
    "service_id",
    "gross_amount_base",
    "commission_pct",
    "commission_amount",
    "status",
    "payout_id",
  ];
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      [
        r.id,
        r.period_date,
        r.freelancer_name,
        r.service_id,
        r.gross_amount_base,
        r.commission_pct,
        r.commission_amount,
        r.status,
        r.payout_id ?? "",
      ].join(";")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agent-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
