"use client";

import * as React from "react";
import type { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ═══════════════════════════════════════════════════════════════════
// MOCK ORG (fashion detection)
// ═══════════════════════════════════════════════════════════════════

export const MOCK_ORG = {
  id: "org-lama",
  business_vertical: "FMCG_RETAIL" as "FMCG_RETAIL" | "FASHION_RETAIL",
  payment_mode: "NOMINAL_ACCOUNT" as "NOMINAL_ACCOUNT" | "CLIENT_DIRECT",
  freelance_module_enabled: true,
};

// ═══════════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════════

export type LamaHealth = "connected" | "degraded" | "disconnected";

export type Translator = ReturnType<typeof useTranslations>;

export interface SftpCheckResult {
  filename: string;
  found: boolean;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const WEBHOOK_EVENT_OPTIONS = [
  "task.created", "task.completed", "task.approved", "task.rejected",
  "shift.opened", "shift.closed", "goal.activated", "goal.completed",
];

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGES
// ═══════════════════════════════════════════════════════════════════

export function LamaStatusBadge({
  health,
  t,
}: {
  health: LamaHealth;
  t: Translator;
}) {
  if (health === "connected")
    return (
      <Badge variant="outline" className="text-success border-success/30 bg-success/5 gap-1.5">
        <span className="size-1.5 rounded-full bg-success" />
        {t("status.connected")}
      </Badge>
    );
  if (health === "degraded")
    return (
      <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5 gap-1.5">
        <span className="size-1.5 rounded-full bg-warning" />
        {t("status.degraded")}
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 gap-1.5">
      <span className="size-1.5 rounded-full bg-destructive" />
      {t("status.disconnected")}
    </Badge>
  );
}

export function AiSourceStatusBadge({ connected }: { connected: boolean }) {
  if (connected)
    return (
      <Badge variant="outline" className="text-success border-success/30 bg-success/5 gap-1.5 text-xs">
        <span className="size-1.5 rounded-full bg-success" />
        Подключено
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1.5 text-xs text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/50" />
      Не подключено
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STAT ITEM
// ═══════════════════════════════════════════════════════════════════

export function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums leading-tight">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

export function HubSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-14 w-64" />
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
