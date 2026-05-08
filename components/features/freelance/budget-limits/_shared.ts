import type { BudgetLimit, BudgetPeriod } from "@/lib/types";

export const TODAY = new Date();
export const TODAY_ISO = TODAY.toISOString().slice(0, 10);

export const PERIODS: BudgetPeriod[] = ["DAY", "WEEK", "MONTH"];

export interface LimitFormValues {
  store_id: number | null;
  store_name: string;
  period: BudgetPeriod | "";
  amount: string;
  valid_from: Date | undefined;
  valid_to: Date | undefined;
}

export function formatRelative(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffMin < 1) return rtf.format(0, "minute");
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffH < 24) return rtf.format(-diffH, "hour");
  if (diffD < 7) return rtf.format(-diffD, "day");
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function isExpired(limit: BudgetLimit): boolean {
  if (!limit.valid_to) return false;
  return limit.valid_to <= TODAY_ISO;
}
