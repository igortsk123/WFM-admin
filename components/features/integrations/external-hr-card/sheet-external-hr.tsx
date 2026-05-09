"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Locale } from "@/lib/types";
import type { ExternalHrConfig } from "@/lib/api/external-hr-sync";
import type { ExternalHrSyncLog } from "@/lib/types";
import {
  getExternalHrSyncLogs,
  triggerExternalHrSync,
} from "@/lib/api/external-hr-sync";

import { ConfigTab } from "./tab-config";
import { SyncLogTable } from "./section-sync-log";

// ═══════════════════════════════════════════════════════════════════
// EXTERNAL HR SHEET
// ═══════════════════════════════════════════════════════════════════

export function ExternalHrSheet({
  open,
  onOpenChange,
  initialTab,
  config,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTab?: "config" | "history";
  config: ExternalHrConfig | undefined;
  onSaved: () => void;
}) {
  const t = useTranslations("screen.integrations.external_hr_section");
  const tToast = useTranslations("screen.integrations.toasts");
  const locale = useLocale() as Locale;

  const [activeTab, setActiveTab] = React.useState<string>(initialTab ?? "config");
  const [logs, setLogs] = React.useState<ExternalHrSyncLog[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(false);
  const [triggering, setTriggering] = React.useState(false);

  // Sync initial tab
  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab ?? "config");
    }
  }, [open, initialTab]);

  // Load logs when history tab is opened
  React.useEffect(() => {
    if (open && activeTab === "history" && logs.length === 0) {
      loadLogs();
    }
  }, [open, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const res = await getExternalHrSyncLogs({ page_size: 20 });
      setLogs(res.data);
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleTrigger() {
    setTriggering(true);
    try {
      await triggerExternalHrSync();
      toast.success(tToast("external_hr_sync_triggered"));
      // Reload logs after 1500ms (API already waits 1.5s)
      await loadLogs();
    } catch {
      toast.error(tToast("error"));
    } finally {
      setTriggering(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col overflow-y-auto">
        <SheetHeader className="shrink-0">
          <SheetTitle>{t("sheet.title")}</SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-6 flex flex-col flex-1"
        >
          <TabsList className="grid w-full grid-cols-2 shrink-0 sticky top-0 z-10 bg-background">
            <TabsTrigger value="config">{t("sheet.tab_config")}</TabsTrigger>
            <TabsTrigger value="history">{t("sheet.tab_history")}</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4 flex-1">
            <ConfigTab
              config={config}
              onSaved={() => {
                onSaved();
                onOpenChange(false);
              }}
              t={t}
              tToast={tToast}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4 flex-1">
            <SyncLogTable
              logs={logs}
              loading={logsLoading || triggering}
              locale={locale}
              onTrigger={handleTrigger}
              t={t}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
