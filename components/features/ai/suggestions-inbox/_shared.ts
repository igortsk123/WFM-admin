import type { useTranslations } from "next-intl";

import type { FunctionalRole } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants shared between sub-components
// ─────────────────────────────────────────────────────────────────────────────

export type TabValue = "all" | "PENDING" | "EDITED" | "ACCEPTED" | "REJECTED";

export type TFn = ReturnType<typeof useTranslations<"screen.aiSuggestions">>;
export type TCommonFn = ReturnType<typeof useTranslations<"common">>;

export const DECISION_MAKERS: FunctionalRole[] = [
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "PLATFORM_ADMIN",
];

export const READ_ONLY_ROLES: FunctionalRole[] = ["STORE_DIRECTOR"];

export const FORBIDDEN_ROLES: FunctionalRole[] = [
  "HR_MANAGER",
  "OPERATOR",
  "WORKER",
];

export const TABS: { value: TabValue; labelKey: string }[] = [
  { value: "all", labelKey: "tabs.all" },
  { value: "PENDING", labelKey: "tabs.pending" },
  { value: "EDITED", labelKey: "tabs.edited" },
  { value: "ACCEPTED", labelKey: "tabs.accepted" },
  { value: "REJECTED", labelKey: "tabs.rejected" },
];

export const REJECT_REASONS = [
  "not_relevant",
  "already_in_progress",
  "disagree_analysis",
  "too_generic",
  "other",
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];
