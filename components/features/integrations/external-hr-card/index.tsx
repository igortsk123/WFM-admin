"use client";

/**
 * External HR System integration card + Sheet with config + sync history.
 * Section 62 — visible when organization.freelance_module_enabled=true.
 * Config actions restricted to NETWORK_OPS; others see read-only card.
 */

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  AlertCircle,
  Clock,
  LinkIcon,
  Settings,
  Wrench,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { formatRelative } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";
import {
  getExternalHrConfig,
  getExternalHrSyncLogs,
} from "@/lib/api/external-hr-sync";

import {
  type ExternalHrCardInfo,
  type ExternalHrStatus,
} from "./_shared";
import { ExternalHrStatusBadge } from "./badge-status";
import { ExternalHrSheet } from "./sheet-external-hr";

// ═══════════════════════════════════════════════════════════════════
// STAT ITEM (re-used locally)
// ═══════════════════════════════════════════════════════════════════

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums leading-tight">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXTERNAL HR CARD — Main export
// ═══════════════════════════════════════════════════════════════════

interface ExternalHrCardProps {
  /** Pass true when current user has NETWORK_OPS role (can edit config) */
  canConfigure?: boolean;
}

export function ExternalHrCard({ canConfigure = true }: ExternalHrCardProps) {
  const t = useTranslations("screen.integrations.external_hr_section");
  const locale = useLocale() as Locale;

  const [info, setInfo] = React.useState<ExternalHrCardInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetInitialTab, setSheetInitialTab] = React.useState<"config" | "history">("config");

  React.useEffect(() => {
    loadInfo();
  }, []);

  async function loadInfo() {
    setLoading(true);
    try {
      const [cfgRes, logsRes] = await Promise.all([
        getExternalHrConfig(),
        getExternalHrSyncLogs({ page_size: 7, sort_by: "occurred_at", sort_dir: "desc" }),
      ]);

      const cfg = cfgRes.data;
      const recentLogs = logsRes.data;

      // Derive status
      let status: ExternalHrStatus = "NOT_CONFIGURED";
      if (cfg.enabled && cfg.endpoint) {
        status = cfg.last_sync_status === "ERROR" ? "ERROR" : "ACTIVE";
      }

      // Aggregate 7-day stats from logs
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent7d = recentLogs.filter(
        (l) => new Date(l.occurred_at) >= cutoff
      );
      const applications_7d = recent7d.reduce((s, l) => s + l.applications_received, 0);
      const freelancers_7d = recent7d.reduce((s, l) => s + l.freelancers_created, 0);

      setInfo({
        status,
        last_sync_at: cfg.last_sync_at,
        applications_7d,
        freelancers_7d,
        config: cfg,
      });
    } finally {
      setLoading(false);
    }
  }

  function openSheet(tab: "config" | "history" = "config") {
    setSheetInitialTab(tab);
    setSheetOpen(true);
  }

  if (loading) {
    return <Skeleton className="h-52 rounded-xl" />;
  }

  if (!info) return null;

  const buttonConfig = {
    NOT_CONFIGURED: {
      label: t("card.btn_connect"),
      variant: "default" as const,
      Icon: Zap,
    },
    ACTIVE: {
      label: t("card.btn_settings"),
      variant: "outline" as const,
      Icon: Settings,
    },
    ERROR: {
      label: t("card.btn_fix"),
      variant: "destructive" as const,
      Icon: Wrench,
    },
  }[info.status];

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LinkIcon className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">{t("card.title")}</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {t("card.description")}
                </p>
              </div>
            </div>
            <ExternalHrStatusBadge status={info.status} t={t} />
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3 space-y-3">
          {info.status === "ACTIVE" && (
            <div className="grid grid-cols-1 gap-1.5">
              <StatItem
                label={t("card.stat_last_sync")}
                value={
                  info.last_sync_at
                    ? formatRelative(new Date(info.last_sync_at), locale)
                    : "—"
                }
              />
              <StatItem
                label={t("card.stat_applications_7d")}
                value={info.applications_7d}
              />
              <StatItem
                label={t("card.stat_freelancers_7d")}
                value={info.freelancers_7d}
              />
            </div>
          )}

          {info.status === "ERROR" && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-sm">
                Проверьте API ключ и доступность endpoint.
              </AlertDescription>
            </Alert>
          )}

          {info.status === "NOT_CONFIGURED" && (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0 mt-0.5" />
              <span>Система доступна для подключения. Требуются API ключ и endpoint от вашей HR-системы.</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2 border-t border-border pt-3">
          {canConfigure ? (
            <Button
              size="sm"
              variant={buttonConfig.variant}
              className="gap-2 min-h-[44px]"
              onClick={() => openSheet("config")}
            >
              <buttonConfig.Icon className="size-3.5" />
              {buttonConfig.label}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Настройки доступны роли NETWORK_OPS
            </p>
          )}
        </CardFooter>
      </Card>

      <ExternalHrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialTab={sheetInitialTab}
        config={info.config}
        onSaved={loadInfo}
      />
    </>
  );
}

// Re-export public types for backward compatibility
export type { ExternalHrStatus, ExternalHrCardInfo } from "./_shared";
