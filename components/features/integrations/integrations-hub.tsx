"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { PageHeader } from "@/components/shared/page-header";

import {
  getIntegrationsStatus,
  getWebhooks,
  getExcelImportHistory,
} from "@/lib/api/integrations";
import type {
  IntegrationsStatus,
  Webhook as WebhookType,
  ExcelImportEvent,
} from "@/lib/api/integrations";
import { formatRelative } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";
import { ExternalHrCard } from "@/components/features/integrations/external-hr-card";

import { HubSkeleton, MOCK_ORG } from "./integrations-hub/_shared";
import { LamaCard } from "./integrations-hub/card-lama";
import { ExcelCard } from "./integrations-hub/card-excel";
import { WebhooksCard } from "./integrations-hub/card-webhooks";
import { ApiKeysCard } from "./integrations-hub/card-api-keys";
import { NominalAccountCard } from "./integrations-hub/card-nominal-account";
import { AiSourcesSection } from "./integrations-hub/ai-source-cards";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function IntegrationsHub() {
  const t = useTranslations("screen.integrations");
  const locale = useLocale() as Locale;

  const [status, setStatus] = React.useState<IntegrationsStatus | null>(null);
  const [webhooks, setWebhooks] = React.useState<WebhookType[]>([]);
  const [excelHistory, setExcelHistory] = React.useState<ExcelImportEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const isFashion = MOCK_ORG.business_vertical === "FASHION_RETAIL";

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const [statusRes, webhooksRes, historyRes] = await Promise.all([
          getIntegrationsStatus(),
          getWebhooks(),
          getExcelImportHistory(),
        ]);
        setStatus(statusRes.data);
        setWebhooks(webhooksRes.data);
        setExcelHistory(historyRes.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <HubSkeleton />;
  if (error || !status) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={[{ label: t("breadcrumbs.integrations") }]}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Не удалось загрузить статус интеграций</span>
            <Button size="sm" variant="outline" onClick={() => setLoading(true)}>Повторить</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const lamaHealth = status.lama.health ?? (status.lama.connected ? "connected" : "disconnected");
  const lamaLastSync = status.lama.last_sync_at
    ? formatRelative(new Date(status.lama.last_sync_at), locale)
    : "—";

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[{ label: t("breadcrumbs.integrations") }]}
      />

      {/* ── 4 Integration cards ─────────────────────────────────── */}
      <section aria-label="Основные интеграции">
        <div className="grid gap-6 md:grid-cols-2">

          <LamaCard
            status={status}
            lamaHealth={lamaHealth}
            lamaLastSync={lamaLastSync}
            onStatusUpdate={setStatus}
          />

          <ExcelCard
            status={status}
            excelHistory={excelHistory}
            onHistoryUpdate={setExcelHistory}
          />

          <WebhooksCard
            status={status}
            webhooks={webhooks}
            onWebhooksUpdate={setWebhooks}
          />

          <ApiKeysCard status={status} />

          {/* Nominal Account Card — only for tenants with payment_mode === NOMINAL_ACCOUNT */}
          {MOCK_ORG.freelance_module_enabled
            && MOCK_ORG.payment_mode === "NOMINAL_ACCOUNT"
            && status.nominal_account && (
            <NominalAccountCard
              info={status.nominal_account}
              onRefresh={async () => {
                const res = await getIntegrationsStatus();
                setStatus(res.data);
              }}
            />
          )}

          {/* External HR System Card — only when freelance_module_enabled */}
          {MOCK_ORG.freelance_module_enabled && (
            <ExternalHrCard canConfigure={true} />
          )}
        </div>
      </section>

      {/* ── AI Sources ──────────────────────────────────────────── */}
      <AiSourcesSection isFashion={isFashion} />
    </div>
  );
}
