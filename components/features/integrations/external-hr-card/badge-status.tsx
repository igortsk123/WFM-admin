"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ExternalHrStatus, Translator } from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

export function ExternalHrStatusBadge({
  status,
  t,
}: {
  status: ExternalHrStatus;
  t: Translator;
}) {
  const cfg: Record<ExternalHrStatus, { cls: string; labelKey: string }> = {
    NOT_CONFIGURED: {
      cls: "text-muted-foreground border-border",
      labelKey: "card.status_not_configured",
    },
    ACTIVE: {
      cls: "text-success border-success/30 bg-success/5",
      labelKey: "card.status_active",
    },
    ERROR: {
      cls: "text-destructive border-destructive/30 bg-destructive/5",
      labelKey: "card.status_error",
    },
  };
  const { cls, labelKey } = cfg[status];
  return (
    <Badge variant="outline" className={cn("shrink-0 gap-1.5", cls)}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "ACTIVE" && "bg-success",
          status === "ERROR" && "bg-destructive",
          status === "NOT_CONFIGURED" && "bg-muted-foreground/50"
        )}
      />
      {t(labelKey)}
    </Badge>
  );
}
