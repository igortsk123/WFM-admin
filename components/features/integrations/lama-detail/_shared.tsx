"use client";

import * as React from "react";
import type { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { LamaSyncLog } from "@/lib/api/integrations";

// ═══════════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════════

export type Translator = ReturnType<typeof useTranslations>;

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}мс`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}с`;
  return `${Math.floor(ms / 60000)}м ${Math.round((ms % 60000) / 1000)}с`;
}

// ═══════════════════════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════════════════════

export function SyncStatusBadge({ status }: { status: LamaSyncLog["status"] }) {
  if (status === "SUCCESS")
    return (
      <Badge variant="outline" className="text-success border-success/30 bg-success/5 gap-1">
        <CheckCircle2 className="size-3" />
        Успех
      </Badge>
    );
  if (status === "PARTIAL")
    return (
      <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5 gap-1">
        <AlertTriangle className="size-3" />
        Частично
      </Badge>
    );
  if (status === "RUNNING")
    return (
      <Badge variant="outline" className="text-info border-info/30 bg-info/5 gap-1">
        <Loader2 className="size-3 animate-spin" />
        Выполняется
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="size-3" />
      Ошибка
    </Badge>
  );
}

export function SyncTypeBadge({ type }: { type: LamaSyncLog["type"] }) {
  const label = type === "FULL" ? "Полная" : type === "INCREMENTAL" ? "Инкрем." : "Принудит.";
  return (
    <Badge variant="secondary" className="text-xs font-normal">
      {label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const TRANSFORM_OPTIONS = ["none", "lowercase", "trim", "regex"] as const;

export const WFM_FIELD_OPTIONS: Record<string, string[]> = {
  users: ["external_id", "last_name", "first_name", "middle_name", "phone", "email", "position_name", "store_id", "hired_at"],
  stores: ["external_code", "name", "address", "city", "region", "store_type"],
  positions: ["code", "name", "description", "default_rank"],
};

export const TIMEZONES = [
  "Asia/Tomsk",
  "Asia/Novosibirsk",
  "Asia/Krasnoyarsk",
  "Asia/Yekaterinburg",
  "Europe/Moscow",
  "UTC",
];
