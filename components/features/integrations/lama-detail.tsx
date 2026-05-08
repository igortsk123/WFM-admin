"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { PageHeader } from "@/components/shared/page-header";

import { getLamaConnection } from "@/lib/api/integrations";
import type { LamaConnection } from "@/lib/api/integrations";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";

import { StatusTab } from "./lama-detail/tab-status";

// ── Non-default tabs: lazy-loaded on click ────────────────────────────────────
const TabSkeleton = () => (
  <div className="h-64 animate-pulse rounded-md bg-muted/50" />
);

const MappingTab = dynamic(
  () => import("./lama-detail/tab-mapping").then((m) => m.MappingTab),
  { loading: () => <TabSkeleton /> },
);
const ScheduleTab = dynamic(
  () => import("./lama-detail/tab-schedule").then((m) => m.ScheduleTab),
  { loading: () => <TabSkeleton /> },
);
const LogsTab = dynamic(
  () => import("./lama-detail/tab-logs").then((m) => m.LogsTab),
  { loading: () => <TabSkeleton /> },
);

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function LamaDetail() {
  const t = useTranslations("screen.integrations");
  const locale = useLocale() as Locale;
  const [tab, setTab] = React.useState("status");
  const [connection, setConnection] = React.useState<LamaConnection | null>(null);
  const [loading, setLoading] = React.useState(true);

  const LAMA_HEALTH = "connected" as "connected" | "degraded" | "disconnected";
  const LAST_SYNC = "2026-04-28T06:00:00Z";

  async function loadConnection() {
    const res = await getLamaConnection();
    setConnection(res.data);
    setLoading(false);
  }

  React.useEffect(() => {
    loadConnection();
  }, []);

  const lastSyncFormatted = formatDateTime(new Date(LAST_SYNC), locale);
  const lastSyncRelative = formatRelative(new Date(LAST_SYNC), locale);

  return (
    <div className="space-y-6">
      <PageHeader
        title="LAMA"
        subtitle={t("lama_detail.page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.integrations"), href: ADMIN_ROUTES.integrations },
          { label: "LAMA" },
        ]}
      />

      {/* Status Banner */}
      {LAMA_HEALTH === "connected" && (
        <Alert className="border-success/30 bg-success/5">
          <CheckCircle2 className="size-4 text-success" />
          <AlertDescription className="text-sm text-success">
            {t("lama_detail.banner_active", { time: `${lastSyncFormatted} (${lastSyncRelative})` })}
          </AlertDescription>
        </Alert>
      )}
      {LAMA_HEALTH === "degraded" && (
        <Alert className="border-warning/30 bg-warning/5">
          <AlertTriangle className="size-4 text-warning" />
          <AlertDescription className="text-sm text-warning">
            {t("lama_detail.banner_degraded", { time: lastSyncFormatted })}
          </AlertDescription>
        </Alert>
      )}
      {LAMA_HEALTH === "disconnected" && (
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertDescription>{t("lama_detail.banner_disconnected")}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto flex-nowrap">
          <TabsTrigger value="status">{t("lama_detail.tab_status")}</TabsTrigger>
          <TabsTrigger value="mapping">{t("lama_detail.tab_mapping")}</TabsTrigger>
          <TabsTrigger value="schedule">{t("lama_detail.tab_schedule")}</TabsTrigger>
          <TabsTrigger value="logs">{t("lama_detail.tab_logs")}</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6">
          {loading || !connection ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-48" />
              <Skeleton className="h-40" />
            </div>
          ) : (
            <StatusTab connection={connection} t={t} locale={locale} onReload={loadConnection} />
          )}
        </TabsContent>

        <TabsContent value="mapping" className="mt-6">
          <MappingTab t={t} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <ScheduleTab t={t} />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <LogsTab t={t} locale={locale} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
