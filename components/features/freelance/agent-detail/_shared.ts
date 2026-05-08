import type { Agent, AgentEarning, User } from "@/lib/types";

// ─── shared types ─────────────────────────────────────────────────────────────

export type AgentWithRoster = Agent & { freelancers: User[]; earnings: AgentEarning[] };

// ─── helpers ──────────────────────────────────────────────────────────────────

export function formatMoney(v: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatDate(s: string | null | undefined, locale: string) {
  if (!s) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(s));
}
