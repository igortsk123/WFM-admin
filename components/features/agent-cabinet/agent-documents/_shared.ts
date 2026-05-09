import type { AgentDocument, AgentDocumentType } from "@/lib/api/agent-cabinet";
import type { Locale } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

export const DOCUMENT_TYPES: AgentDocumentType[] = ["CONTRACT", "CLOSING_ACT", "INVOICE"];

// ─────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────

export type BadgeDocumentType = AgentDocumentType;

export type FetchState = "idle" | "loading" | "error" | "success";

export interface FilterState {
  type: string;
  dateFrom: string;
  dateTo: string;
}

export const TYPE_VARIANT: Record<BadgeDocumentType, string> = {
  CONTRACT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  CLOSING_ACT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  INVOICE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Format period string e.g. "2026-04" → "Апрель 2026" / "April 2026"
 */
export function formatPeriod(period: string, locale: Locale): string {
  const parts = period.split("-");
  if (parts.length < 2) return period;
  const [year, month] = parts;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

/**
 * Generate a mock signed URL valid for 5 minutes.
 * In production this would call the backend to get a presigned URL.
 */
export function generateSignedUrl(doc: AgentDocument): string {
  const expires = Date.now() + 5 * 60 * 1000;
  return `${doc.url}?token=mock-signed-token&expires=${expires}`;
}

// ─────────────────────────────────────────────────────────────────
// DATE STRING ↔ DATE ADAPTER (filters store ISO date strings;
// shared DateRangePicker uses Date | undefined)
// ─────────────────────────────────────────────────────────────────

export function parseIsoDate(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export function toIsoDate(d: Date | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}
