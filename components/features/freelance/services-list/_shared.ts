import { format } from "date-fns";
import { ru } from "date-fns/locale";

import type { PaymentMode, ServiceStatus } from "@/lib/types";

// ─── SWR keys ─────────────────────────────────────────────────────────────────

export const SWR_SERVICES_KEY = "freelance-services-list";
export const SWR_NO_SHOWS_KEY = "freelance-no-shows-list";

// ─── Tab keys ─────────────────────────────────────────────────────────────────

export type TabKey =
  | "all"
  | "pending"
  | "ready"
  | "paid"
  | "confirmed"
  | "no_show"
  | "disputed";

export function getTabStatuses(
  tab: TabKey,
  paymentMode: PaymentMode,
): ServiceStatus[] | undefined {
  switch (tab) {
    case "all":
      return undefined;
    case "pending":
      return ["COMPLETED"];
    case "ready":
      return paymentMode === "NOMINAL_ACCOUNT"
        ? ["CONFIRMED", "READY_TO_PAY"]
        : undefined;
    case "paid":
      return ["PAID"];
    case "confirmed":
      return ["CONFIRMED"];
    case "no_show":
      return ["NO_SHOW"];
    case "disputed":
      return ["DISPUTED"];
    default:
      return undefined;
  }
}

export function getTabsForPaymentMode(paymentMode: PaymentMode): TabKey[] {
  if (paymentMode === "NOMINAL_ACCOUNT") {
    return ["all", "pending", "ready", "paid", "no_show", "disputed"];
  }
  return ["all", "pending", "confirmed", "no_show", "disputed"];
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatAmount(
  amount: number,
  currency = "RUB",
  locale = "ru",
): string {
  const symbol = currency === "RUB" ? "₽" : currency === "GBP" ? "£" : "$";
  const formatted = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${symbol}`;
}

export function formatDate(dateStr: string, locale: string): string {
  try {
    return format(new Date(dateStr), "d MMM", {
      locale: locale === "ru" ? ru : undefined,
    });
  } catch {
    return dateStr;
  }
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export interface ServicesPermissions {
  canAdjustAmount: boolean;
  canConfirm: boolean;
  canSendToLegal: boolean;
  canExport: boolean;
}

export function getServicesPermissions(
  role: string,
  paymentMode: PaymentMode,
): ServicesPermissions {
  const isNominal = paymentMode === "NOMINAL_ACCOUNT";

  return {
    canAdjustAmount:
      isNominal && (role === "REGIONAL" || role === "NETWORK_OPS"),
    canConfirm:
      role === "STORE_DIRECTOR" ||
      role === "SUPERVISOR" ||
      role === "REGIONAL" ||
      role === "NETWORK_OPS",
    canSendToLegal: role === "NETWORK_OPS" || role === "HR_MANAGER",
    canExport:
      role === "NETWORK_OPS" ||
      role === "REGIONAL" ||
      role === "HR_MANAGER",
  };
}

// ─── Empty state per-tab ──────────────────────────────────────────────────────

export interface EmptyStateContent {
  title: string;
  description: string;
}

export function getEmptyState(
  tab: TabKey,
  t: (key: string) => string,
): EmptyStateContent {
  if (tab === "no_show") {
    return {
      title: t("empty.no_show_title"),
      description: t("empty.no_show_description"),
    };
  }
  if (tab === "pending") {
    return {
      title: t("empty.pending_title"),
      description: t("empty.pending_description"),
    };
  }
  if (tab === "all") {
    return {
      title: t("empty.all_title"),
      description: t("empty.all_description"),
    };
  }
  return {
    title: t("empty.generic_title"),
    description: t("empty.generic_description"),
  };
}
