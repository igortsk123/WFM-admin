"use client";

/**
 * External HR System integration card + Sheet with config + sync history.
 * Section 62 — visible when organization.freelance_module_enabled=true.
 * Config actions restricted to NETWORK_OPS; others see read-only card.
 */

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  LinkIcon,
  Settings,
  Wrench,
  Zap,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

import { formatDateTime, formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import type { ExternalHrConfig } from "@/lib/api/external-hr-sync";
import type { ExternalHrSyncLog } from "@/lib/types";
import {
  getExternalHrConfig,
  updateExternalHrConfig,
  getExternalHrSyncLogs,
  triggerExternalHrSync,
} from "@/lib/api/external-hr-sync";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type ExternalHrStatus = "NOT_CONFIGURED" | "ACTIVE" | "ERROR";

export interface ExternalHrCardInfo {
  status: ExternalHrStatus;
  last_sync_at?: string;
  applications_7d: number;
  freelancers_7d: number;
  config?: ExternalHrConfig;
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULE OPTIONS
// ═══════════════════════════════════════════════════════════════════

const SCHEDULE_OPTIONS = [
  { value: "*/15 * * * *", key: "schedule_15m" },
  { value: "0 * * * *", key: "schedule_1h" },
  { value: "0 */6 * * *", key: "schedule_6h" },
  { value: "0 0 * * *", key: "schedule_daily" },
  { value: "manual", key: "schedule_manual" },
] as const;

// ═══════════════════════════════════════════════════════════════════
// MOCK STORE / WORK TYPE options for field mapping
// ═══════════════════════════════════════════════════════════════════

const MOCK_STORE_OPTIONS = [
  { value: "1", label: "СПАР Томск, пр. Ленина 80" },
  { value: "2", label: "СПАР Томск, ул. Вершинина 17" },
  { value: "3", label: "СПАР Новосибирск, Красный пр. 200" },
];

const MOCK_WORK_TYPE_OPTIONS = [
  { value: "4", label: "Выкладка" },
  { value: "6", label: "Инвентаризация" },
  { value: "2", label: "Касса" },
  { value: "13", label: "Складские работы" },
];

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

function ExternalHrStatusBadge({
  status,
  t,
}: {
  status: ExternalHrStatus;
  t: ReturnType<typeof useTranslations>;
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

// ═══════════════════════════════════════════════════════════════════
// MAPPING ROW
// ═══════════════════════════════════════════════════════════════════

interface MappingRow {
  id: string;
  key: string;
  storeValue: string;
  workTypeValue: string;
}

function FieldMappingSection({
  rows,
  onChange,
  t,
}: {
  rows: MappingRow[];
  onChange: (rows: MappingRow[]) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = React.useState(false);

  function updateRow(id: string, field: keyof MappingRow, val: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  }

  function addRow() {
    onChange([
      ...rows,
      { id: `row-${Date.now()}`, key: "", storeValue: "", workTypeValue: "" },
    ]);
    setOpen(true);
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors min-h-[44px]"
        >
          <span>{t("sheet.mapping_title")}</span>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-3 rounded-md border bg-muted/20 p-3">
          {/* Store mapping */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("sheet.mapping_store_label")}</Label>
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2"
              >
                <Input
                  value={row.key}
                  onChange={(e) => updateRow(row.id, "key", e.target.value)}
                  placeholder={t("sheet.mapping_key_placeholder")}
                  className="flex-1 min-h-[44px] text-sm font-mono"
                />
                <span className="hidden text-muted-foreground sm:block">→</span>
                <Select
                  value={row.storeValue}
                  onValueChange={(v) => updateRow(row.id, "storeValue", v)}
                >
                  <SelectTrigger className="flex-1 min-h-[44px]">
                    <SelectValue placeholder={t("sheet.mapping_value_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_STORE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Remove"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Work type mapping */}
          <div className="space-y-1.5 border-t border-border pt-3">
            <Label className="text-xs text-muted-foreground">{t("sheet.mapping_work_type_label")}</Label>
            {rows.map((row) => (
              <div
                key={`wt-${row.id}`}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2"
              >
                <Input
                  value={row.key}
                  readOnly
                  className="flex-1 min-h-[44px] text-sm font-mono bg-muted/50"
                  placeholder={t("sheet.mapping_key_placeholder")}
                />
                <span className="hidden text-muted-foreground sm:block">→</span>
                <Select
                  value={row.workTypeValue}
                  onValueChange={(v) => updateRow(row.id, "workTypeValue", v)}
                >
                  <SelectTrigger className="flex-1 min-h-[44px]">
                    <SelectValue placeholder={t("sheet.mapping_value_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_WORK_TYPE_OPTIONS.map((wt) => (
                      <SelectItem key={wt.value} value={wt.value}>
                        {wt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="size-9 shrink-0" />
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 min-h-[44px] w-full text-sm"
            onClick={addRow}
          >
            <Plus className="size-3.5" />
            {t("sheet.mapping_add")}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SYNC LOG TABLE
// ═══════════════════════════════════════════════════════════════════

function SyncLogTable({
  logs,
  loading,
  locale,
  onTrigger,
  t,
}: {
  logs: ExternalHrSyncLog[];
  loading: boolean;
  locale: Locale;
  onTrigger: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top action */}
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-2 min-h-[44px]"
          onClick={onTrigger}
        >
          <RefreshCw className="size-3.5" />
          {t("sheet.trigger_sync")}
        </Button>
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("sheet.log_no_data")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">{t("sheet.log_col_datetime")}</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">{t("sheet.log_col_trigger")}</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">{t("sheet.log_col_received")}</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">{t("sheet.log_col_created")}</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">{t("sheet.log_col_errors")}</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">{t("sheet.log_col_status")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isOk = log.errors_count === 0;
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={cn(
                        "border-b transition-colors",
                        !isOk ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"
                      )}
                    >
                      <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDateTime(new Date(log.occurred_at), locale)}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {log.triggered_by === "MANUAL"
                          ? t("sheet.log_trigger_manual")
                          : t("sheet.log_trigger_schedule")}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                        {log.applications_received}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                        {log.freelancers_created}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        {log.errors_count > 0 ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-destructive hover:underline"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          >
                            {log.errors_count}
                            {isExpanded ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            isOk
                              ? "text-success border-success/30 bg-success/5"
                              : "text-destructive border-destructive/30 bg-destructive/5"
                          )}
                        >
                          {isOk ? t("sheet.log_status_ok") : t("sheet.log_status_errors")}
                        </Badge>
                      </td>
                    </tr>
                    {isExpanded && log.errors && log.errors.length > 0 && (
                      <tr className="border-b bg-destructive/5">
                        <td colSpan={6} className="px-3 py-2.5">
                          <div className="space-y-1">
                            {log.errors.map((err, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-xs text-destructive"
                              >
                                <span className="font-mono shrink-0">{err.external_ref}</span>
                                <span>—</span>
                                <span>{err.error}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG TAB FORM
// ═══════════════════════════════════════════════════════════════════

function ConfigTab({
  config,
  onSaved,
  t,
  tToast,
  tCommon,
}: {
  config: ExternalHrConfig | undefined;
  onSaved: () => void;
  t: ReturnType<typeof useTranslations>;
  tToast: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  const [enabled, setEnabled] = React.useState(config?.enabled ?? false);
  const [endpoint, setEndpoint] = React.useState(config?.endpoint ?? "");
  const [apiKey, setApiKey] = React.useState("");
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [schedule, setSchedule] = React.useState(config?.schedule ?? "0 */6 * * *");

  // Build initial mapping rows from config
  const initialRows: MappingRow[] = React.useMemo(() => {
    if (!config?.field_mapping) return [];
    return Object.entries(config.field_mapping).map(([key, val]) => ({
      id: `init-${key}`,
      key,
      storeValue: val,
      workTypeValue: "",
    }));
  }, [config]);
  const [mappingRows, setMappingRows] = React.useState<MappingRow[]>(initialRows);

  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<"ok" | "error" | null>(null);

  // Validation
  const endpointValid = endpoint === "" || endpoint.startsWith("https://");
  const apiKeyValid = apiKey === "" || apiKey.length >= 16;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!endpointValid || !apiKeyValid) return;
    setSaving(true);
    try {
      const result = await updateExternalHrConfig({
        endpoint,
        ...(apiKey ? { api_key: apiKey } : {}),
        schedule,
        field_mapping: Object.fromEntries(mappingRows.map((r) => [r.key, r.storeValue])),
      });
      if (result.success) {
        toast.success(tToast("external_hr_saved"));
        onSaved();
      } else {
        toast.error(result.error?.message ?? tToast("error"));
      }
    } catch {
      toast.error(tToast("error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!endpoint.startsWith("https://")) {
      setTestResult("error");
      toast.error(tToast("external_hr_test_error"));
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Simulate test
      await new Promise((r) => setTimeout(r, 1200));
      setTestResult("ok");
      toast.success(tToast("external_hr_test_ok"));
    } catch {
      setTestResult("error");
      toast.error(tToast("external_hr_test_error"));
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Sync toggle */}
      <div className="flex items-center justify-between gap-3 rounded-md border p-3 min-h-[44px]">
        <Label htmlFor="hr-enabled" className="font-medium">
          {t("sheet.toggle_label")}
        </Label>
        <Switch
          id="hr-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {/* Endpoint URL */}
      <div className="space-y-1.5">
        <Label htmlFor="hr-endpoint">
          {t("sheet.endpoint_label")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="hr-endpoint"
          type="url"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder={t("sheet.endpoint_placeholder")}
          className={cn("min-h-[44px]", !endpointValid && "border-destructive")}
        />
        {!endpointValid && (
          <p className="text-xs text-destructive">URL должен начинаться с https://</p>
        )}
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <Label htmlFor="hr-apikey">
          {t("sheet.api_key_label")}
          {config?.api_key_masked && (
            <span className="ml-2 text-xs font-mono text-muted-foreground">
              {config.api_key_masked}
            </span>
          )}
        </Label>
        <div className="relative">
          <Input
            id="hr-apikey"
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-••••••••••••••••"
            className={cn("min-h-[44px] pr-12", !apiKeyValid && "border-destructive")}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowApiKey((v) => !v)}
            aria-label={showApiKey ? t("sheet.api_key_change") : t("sheet.api_key_show")}
          >
            {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {!apiKeyValid && (
          <p className="text-xs text-destructive">Минимум 16 символов</p>
        )}
      </div>

      {/* Schedule */}
      <div className="space-y-1.5">
        <Label htmlFor="hr-schedule">{t("sheet.schedule_label")}</Label>
        <Select value={schedule} onValueChange={setSchedule}>
          <SelectTrigger id="hr-schedule" className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHEDULE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(`sheet.${opt.key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Field mapping */}
      <FieldMappingSection
        rows={mappingRows}
        onChange={setMappingRows}
        t={t}
      />

      {/* Test result inline */}
      {testResult && (
        <Alert
          variant={testResult === "ok" ? "default" : "destructive"}
          className={cn(
            testResult === "ok" && "border-success/30 bg-success/5"
          )}
        >
          <AlertCircle className="size-4" />
          <AlertDescription className="text-sm">
            {testResult === "ok" ? t("sheet.test_success") : t("sheet.test_error")}
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={testing || saving}
          className="gap-2 min-h-[44px]"
        >
          {testing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {t("sheet.test")}
        </Button>
        <Button
          type="submit"
          disabled={saving || !endpointValid || !apiKeyValid}
          className="gap-2 min-h-[44px]"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {t("sheet.save")}
        </Button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXTERNAL HR SHEET
// ═══════════════════════════════════════════════════════════════════

function ExternalHrSheet({
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
  const tCommon = useTranslations("common");
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
              tCommon={tCommon}
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
