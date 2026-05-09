// ═══════════════════════════════════════════════════════════════════
// Shared constants, types & helpers for service-norms split
// ═══════════════════════════════════════════════════════════════════

import type { ObjectFormat, ServiceNormUnit } from "@/lib/types";

// ── Enum option lists ─────────────────────────────────────────────────

export const OBJECT_FORMATS: ObjectFormat[] = [
  "SUPERMARKET",
  "HYPERMARKET",
  "CONVENIENCE",
  "SMALL_SHOP",
  "SEWING_WORKSHOP",
  "PRODUCTION_LINE",
  "WAREHOUSE_HUB",
  "OFFICE",
];

export const UNITS: ServiceNormUnit[] = [
  "SKU",
  "PCS",
  "KG",
  "PALLETS",
  "POSITIONS",
  "BOXES",
  "M2",
  "CHECKS",
];

export const CURRENCIES = ["RUB", "GBP", "USD"] as const;

export type Currency = (typeof CURRENCIES)[number];

// ── Write-permission roles ────────────────────────────────────────────

export const WRITE_ROLES = ["SUPERVISOR", "REGIONAL", "NETWORK_OPS"] as const;
export type WriteRole = (typeof WRITE_ROLES)[number];

export function canWrite(role: string): role is WriteRole {
  return WRITE_ROLES.includes(role as WriteRole);
}

// ── Badge colour maps ─────────────────────────────────────────────────

export const FORMAT_COLOR: Record<ObjectFormat, string> = {
  SUPERMARKET: "bg-blue-50 text-blue-700 border-blue-200",
  HYPERMARKET: "bg-violet-50 text-violet-700 border-violet-200",
  CONVENIENCE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SMALL_SHOP: "bg-amber-50 text-amber-700 border-amber-200",
  SEWING_WORKSHOP: "bg-pink-50 text-pink-700 border-pink-200",
  PRODUCTION_LINE: "bg-orange-50 text-orange-700 border-orange-200",
  WAREHOUSE_HUB: "bg-slate-50 text-slate-700 border-slate-200",
  OFFICE: "bg-teal-50 text-teal-700 border-teal-200",
};

export const UNIT_COLOR: Record<ServiceNormUnit, string> = {
  SKU: "bg-blue-50 text-blue-700 border-blue-200",
  PCS: "bg-slate-50 text-slate-700 border-slate-200",
  KG: "bg-amber-50 text-amber-700 border-amber-200",
  PALLETS: "bg-orange-50 text-orange-700 border-orange-200",
  POSITIONS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BOXES: "bg-pink-50 text-pink-700 border-pink-200",
  M2: "bg-teal-50 text-teal-700 border-teal-200",
  CHECKS: "bg-violet-50 text-violet-700 border-violet-200",
};

// ── Helpers ───────────────────────────────────────────────────────────

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Form state ────────────────────────────────────────────────────────

export interface NormFormState {
  object_format: ObjectFormat | "";
  work_type_id: string;
  normative_per_hour: string;
  unit: ServiceNormUnit | "";
  hourly_rate: string;
  currency: Currency;
}

export function makeDefaultForm(defaultCurrency: Currency): NormFormState {
  return {
    object_format: "",
    work_type_id: "",
    normative_per_hour: "",
    unit: "",
    hourly_rate: "",
    currency: defaultCurrency,
  };
}

// ── Translation helper type ───────────────────────────────────────────

export type TFn = (key: string) => string;
