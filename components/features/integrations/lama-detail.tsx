"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Edit,
  Loader2,
  AlertCircle,
  ChevronRight,
  Search,
  Calendar,
  Filter,
  Clock,
  AlertTriangle,
  Info,
  Plus,
  X,
  Download,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { PageHeader } from "@/components/shared/page-header";
import { UserCell } from "@/components/shared/user-cell";

import {
  getLamaConnection,
  getLamaSyncLogs,
  getLamaMapping,
  getLamaSchedule,
  saveLamaMapping,
  saveLamaSchedule,
  testLamaConnection,
  updateLamaConnection,
} from "@/lib/api/integrations";
import type {
  LamaConnection,
  LamaSyncLog,
  LamaMappingRow,
  LamaScheduleConfig,
} from "@/lib/api/integrations";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}мс`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}с`;
  return `${Math.floor(ms / 60000)}м ${Math.round((ms % 60000) / 1000)}с`;
}

function SyncStatusBadge({ status }: { status: LamaSyncLog["status"] }) {
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

function SyncTypeBadge({ type }: { type: LamaSyncLog["type"] }) {
  const label = type === "FULL" ? "Полная" : type === "INCREMENTAL" ? "Инкрем." : "Принудит.";
  return (
    <Badge variant="secondary" className="text-xs font-normal">
      {label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATUS TAB
// ═══════════════════════════════════════════════════════════════════

interface StatusTabProps {
  connection: LamaConnection;
  t: ReturnType<typeof useTranslations>;
  locale: Locale;
  onReload: () => void;
}

function StatusTab({ connection, t, locale, onReload }: StatusTabProps) {
  const [editing, setEditing] = React.useState(false);
  const [showToken, setShowToken] = React.useState(false);
  const [url, setUrl] = React.useState(connection.url);
  const [token, setToken] = React.useState("");
  const [tenantId, setTenantId] = React.useState(connection.tenant_id);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<"SUCCESS" | "ERROR" | null>(null);

  // Force sync state
  const [syncUsers, setSyncUsers] = React.useState(true);
  const [syncStores, setSyncStores] = React.useState(true);
  const [syncShifts, setSyncShifts] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState(0);
  const [syncStatus, setSyncStatus] = React.useState("");
  const [syncAbort, setSyncAbort] = React.useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      await testLamaConnection();
      setTestResult("SUCCESS");
      toast.success(t("toasts.connection_ok"));
    } catch {
      setTestResult("ERROR");
      toast.error(t("toasts.error"));
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveConnection() {
    setSaving(true);
    try {
      await updateLamaConnection({ url, tenant_id: tenantId });
      toast.success("Настройки сохранены");
      setEditing(false);
      onReload();
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleForceSync() {
    if (!syncUsers && !syncStores && !syncShifts) return;
    setSyncing(true);
    setSyncAbort(false);
    setSyncProgress(0);

    const steps: Array<{ label: string; max: number; field: string }> = [
      ...(syncUsers ? [{ label: "пользователи", max: 47, field: "users" }] : []),
      ...(syncStores ? [{ label: "магазины", max: 8, field: "stores" }] : []),
      ...(syncShifts ? [{ label: "смены", max: 1482, field: "shifts" }] : []),
    ];

    const totalSteps = steps.length;
    for (let i = 0; i < totalSteps; i++) {
      if (syncAbort) break;
      const step = steps[i];
      for (let j = 0; j <= step.max; j += Math.ceil(step.max / 20)) {
        if (syncAbort) break;
        setSyncStatus(`${step.label} (${Math.min(j, step.max)}/${step.max})`);
        setSyncProgress(((i * 100) + (j / step.max) * 100) / totalSteps);
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    setSyncProgress(100);
    setSyncStatus("");
    setSyncing(false);
    toast.success(t("toasts.lama_sync_done"));
    onReload();
  }

  const lastTestAt = connection.last_test_at
    ? formatDateTime(new Date(connection.last_test_at), locale)
    : "—";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: t("lama_detail.stat_users"), value: 47, delta: "+2" },
          { label: t("lama_detail.stat_stores"), value: 8, delta: undefined },
          { label: t("lama_detail.stat_shifts"), value: "1 482", delta: "+15" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
            {stat.delta && (
              <p className="text-xs text-success mt-0.5">{stat.delta}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Connection params */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <p className="font-semibold text-sm">{t("lama_detail.connection_params")}</p>
          {!editing && (
            <Button variant="ghost" size="sm" className="gap-2 h-7" onClick={() => setEditing(true)}>
              <Edit className="size-3.5" />
              Редактировать
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t("lama_detail.field_url")}</Label>
              {editing ? (
                <Input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1 font-mono text-xs" />
              ) : (
                <p className="mt-0.5 text-sm font-mono text-foreground">{connection.url}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("lama_detail.field_token")}</Label>
              <div className="flex items-center gap-2 mt-0.5">
                {editing ? (
                  <div className="relative flex-1">
                    <Input
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Введите новый токен"
                      className="font-mono text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-foreground">
                      {showToken ? "lama_tok_abc123def456F2A9" : connection.api_token_masked}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowToken((s) => !s)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("lama_detail.field_tenant")}</Label>
              {editing ? (
                <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="mt-1" />
              ) : (
                <p className="mt-0.5 text-sm text-foreground">{connection.tenant_id}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("lama_detail.field_last_test")}</Label>
              <div className="mt-0.5 flex items-center gap-2">
                {connection.last_test_status === "SUCCESS" ? (
                  <CheckCircle2 className="size-3.5 text-success shrink-0" />
                ) : (
                  <XCircle className="size-3.5 text-destructive shrink-0" />
                )}
                <p className="text-sm text-foreground">{lastTestAt}</p>
                {testResult === "SUCCESS" && (
                  <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-xs">Проверено</Badge>
                )}
                {testResult === "ERROR" && (
                  <Badge variant="destructive" className="text-xs">Ошибка</Badge>
                )}
              </div>
            </div>
          </div>

          {editing ? (
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" disabled={saving} onClick={handleSaveConnection} className="gap-2">
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Сохранить
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Отмена</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" disabled={testing} onClick={handleTest} className="gap-2">
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              {t("lama_detail.test_connection")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Force sync */}
      <Card>
        <CardHeader className="pb-3">
          <p className="font-semibold text-sm">{t("lama_detail.force_sync_title")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {[
              { id: "users", label: t("lama_detail.force_sync_users"), checked: syncUsers, set: setSyncUsers },
              { id: "stores", label: t("lama_detail.force_sync_stores"), checked: syncStores, set: setSyncStores },
              { id: "shifts", label: t("lama_detail.force_sync_shifts"), checked: syncShifts, set: setSyncShifts },
            ].map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(c) => item.set(Boolean(c))}
                  disabled={syncing}
                  id={`sync-${item.id}`}
                />
                {item.label}
              </label>
            ))}
          </div>

          {syncing && (
            <div className="space-y-2">
              <Progress value={syncProgress} className="h-2" />
              {syncStatus && (
                <p className="text-xs text-muted-foreground">
                  Синхронизация: {syncStatus}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={syncing || (!syncUsers && !syncStores && !syncShifts)}
              onClick={handleForceSync}
              className="gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Выполняется…
                </>
              ) : (
                t("lama_detail.force_sync_run")
              )}
            </Button>
            {syncing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSyncAbort(true); setSyncing(false); setSyncProgress(0); setSyncStatus(""); }}
              >
                {t("lama_detail.force_sync_cancel")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAPPING TAB
// ═══════════════════════════════════════════════════════════════════

const TRANSFORM_OPTIONS = ["none", "lowercase", "trim", "regex"] as const;

const WFM_FIELD_OPTIONS: Record<string, string[]> = {
  users: ["external_id", "last_name", "first_name", "middle_name", "phone", "email", "position_name", "store_id", "hired_at"],
  stores: ["external_code", "name", "address", "city", "region", "store_type"],
  positions: ["code", "name", "description", "default_rank"],
};

interface MappingTabProps {
  t: ReturnType<typeof useTranslations>;
}

function MappingTab({ t }: MappingTabProps) {
  const [entity, setEntity] = React.useState<"users" | "stores" | "positions">("users");
  const [rows, setRows] = React.useState<LamaMappingRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    setDirty(false);
    getLamaMapping(entity).then((res) => {
      setRows(res.data);
      setLoading(false);
    });
  }, [entity]);

  function updateRow(id: string, field: keyof LamaMappingRow, value: unknown) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveLamaMapping(entity, rows);
      toast.success(t("toasts.mapping_saved"));
      setDirty(false);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("lama_detail.mapping_desc")}</p>

      <Tabs value={entity} onValueChange={(v) => setEntity(v as typeof entity)}>
        <TabsList>
          <TabsTrigger value="users">{t("lama_detail.mapping_sub_users")}</TabsTrigger>
          <TabsTrigger value="stores">{t("lama_detail.mapping_sub_stores")}</TabsTrigger>
          <TabsTrigger value="positions">{t("lama_detail.mapping_sub_positions")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("lama_detail.mapping_col_lama")}</TableHead>
                  <TableHead>{t("lama_detail.mapping_col_wfm")}</TableHead>
                  <TableHead>{t("lama_detail.mapping_col_transform")}</TableHead>
                  <TableHead className="text-center w-28">{t("lama_detail.mapping_col_required")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.lama_field}</TableCell>
                    <TableCell>
                      <Select value={row.wfm_field} onValueChange={(v) => updateRow(row.id, "wfm_field", v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(WFM_FIELD_OPTIONS[entity] ?? []).map((f) => (
                            <SelectItem key={f} value={f} className="font-mono text-xs">{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={row.transform} onValueChange={(v) => updateRow(row.id, "transform", v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFORM_OPTIONS.map((tr) => (
                            <SelectItem key={tr} value={tr} className="text-xs">{tr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={row.required}
                        onCheckedChange={(c) => updateRow(row.id, "required", c)}
                        aria-label={`Required: ${row.lama_field}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {rows.map((row) => (
              <div key={row.id} className="p-3 space-y-2">
                <p className="text-xs font-mono font-medium">{row.lama_field} → {row.wfm_field}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={row.wfm_field} onValueChange={(v) => updateRow(row.id, "wfm_field", v)}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(WFM_FIELD_OPTIONS[entity] ?? []).map((f) => (
                        <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={row.transform} onValueChange={(v) => updateRow(row.id, "transform", v)}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFORM_OPTIONS.map((tr) => (
                        <SelectItem key={tr} value={tr} className="text-xs">{tr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch checked={row.required} onCheckedChange={(c) => updateRow(row.id, "required", c)} aria-label="Required" />
                    Обяз.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background shadow-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Есть несохранённые изменения</span>
            <Button size="sm" disabled={saving} onClick={handleSave} className="gap-2">
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {t("lama_detail.mapping_save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULE TAB
// ═══════════════════════════════════════════════════════════════════

interface ScheduleTabProps {
  t: ReturnType<typeof useTranslations>;
}

const TIMEZONES = [
  "Asia/Tomsk",
  "Asia/Novosibirsk",
  "Asia/Krasnoyarsk",
  "Asia/Yekaterinburg",
  "Europe/Moscow",
  "UTC",
];

function ScheduleTab({ t }: ScheduleTabProps) {
  const [config, setConfig] = React.useState<LamaScheduleConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [recipientInput, setRecipientInput] = React.useState("");

  React.useEffect(() => {
    getLamaSchedule().then((res) => {
      setConfig(res.data);
      setLoading(false);
    });
  }, []);

  function update<K extends keyof LamaScheduleConfig>(key: K, value: LamaScheduleConfig[K]) {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function addRecipient() {
    const email = recipientInput.trim();
    if (!email || !config) return;
    if (!config.recipients.includes(email)) {
      update("recipients", [...config.recipients, email]);
    }
    setRecipientInput("");
  }

  function removeRecipient(email: string) {
    if (!config) return;
    update("recipients", config.recipients.filter((r) => r !== email));
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await saveLamaSchedule(config);
      toast.success(t("toasts.schedule_saved"));
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-sync card */}
      <Card>
        <CardHeader className="pb-3">
          <p className="font-semibold text-sm">{t("lama_detail.schedule_auto_title")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={config.enabled}
              onCheckedChange={(c) => update("enabled", c)}
              id="sched-enabled"
            />
            <Label htmlFor="sched-enabled">{t("lama_detail.schedule_enabled")}</Label>
          </div>

          {config.enabled && (
            <div className="space-y-4 pl-1">
              <div className="space-y-2">
                <RadioGroup
                  value={config.frequency}
                  onValueChange={(v) => update("frequency", v as LamaScheduleConfig["frequency"])}
                  className="space-y-1"
                >
                  {[
                    { value: "hourly", label: t("lama_detail.schedule_freq_hourly") },
                    { value: "6h", label: t("lama_detail.schedule_freq_6h") },
                    { value: "daily", label: t("lama_detail.schedule_freq_daily") },
                    { value: "custom", label: t("lama_detail.schedule_freq_custom") },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 text-sm cursor-pointer">
                      <RadioGroupItem value={opt.value} id={`freq-${opt.value}`} />
                      {opt.label}
                    </label>
                  ))}
                </RadioGroup>

                {config.frequency === "custom" && (
                  <Input
                    value={config.cron_expression ?? ""}
                    onChange={(e) => update("cron_expression", e.target.value)}
                    placeholder={t("lama_detail.schedule_cron_placeholder")}
                    className="font-mono text-xs max-w-56"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">{t("lama_detail.schedule_tz")}</Label>
                <Select value={config.timezone} onValueChange={(v) => update("timezone", v)}>
                  <SelectTrigger className="max-w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications card */}
      <Card>
        <CardHeader className="pb-3">
          <p className="font-semibold text-sm">{t("lama_detail.notifications_title")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="notify-error" className="text-sm font-normal cursor-pointer">
                {t("lama_detail.notify_on_error")}
              </Label>
              <Switch
                checked={config.notify_on_error}
                onCheckedChange={(c) => update("notify_on_error", c)}
                id="notify-error"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="notify-success" className="text-sm font-normal cursor-pointer">
                {t("lama_detail.notify_on_success")}
              </Label>
              <Switch
                checked={config.notify_on_success}
                onCheckedChange={(c) => update("notify_on_success", c)}
                id="notify-success"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("lama_detail.notify_recipients")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {config.recipients.map((email) => (
                <span key={email} className="flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-xs px-2.5 py-1">
                  {email}
                  <button onClick={() => removeRecipient(email)} className="text-muted-foreground hover:text-foreground ml-0.5">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className="max-w-64 h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
              />
              <Button variant="outline" size="sm" onClick={addRecipient}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={handleSave} className="gap-2">
          {saving && <Loader2 className="size-4 animate-spin" />}
          Сохранить
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOGS TAB
// ═══════════════════════════════════════════════════════════════════

interface LogsTabProps {
  t: ReturnType<typeof useTranslations>;
  locale: Locale;
}

function LogsTab({ t, locale }: LogsTabProps) {
  const [logs, setLogs] = React.useState<LamaSyncLog[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  const [drawerLog, setDrawerLog] = React.useState<LamaSyncLog | null>(null);

  React.useEffect(() => {
    setLoading(true);
    getLamaSyncLogs({ search: search || undefined, status: statusFilter, page, page_size: PAGE_SIZE }).then((res) => {
      setLogs(res.data);
      setTotal(res.total);
      setLoading(false);
    });
  }, [search, statusFilter, page]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(debouncedSearch); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [debouncedSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            placeholder={t("lama_detail.logs_search")}
            className="pl-8 h-8 text-sm w-52"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("lama_detail.logs_status_all")}</SelectItem>
            <SelectItem value="success">{t("lama_detail.logs_status_success")}</SelectItem>
            <SelectItem value="error">{t("lama_detail.logs_status_error")}</SelectItem>
            <SelectItem value="partial">Частично</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Логи не найдены</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">{t("lama_detail.logs_col_time")}</TableHead>
                  <TableHead className="w-24">{t("lama_detail.logs_col_duration")}</TableHead>
                  <TableHead className="w-28">{t("lama_detail.logs_col_type")}</TableHead>
                  <TableHead className="w-28">{t("lama_detail.logs_col_status")}</TableHead>
                  <TableHead>{t("lama_detail.logs_col_records")}</TableHead>
                  <TableHead className="w-24">{t("lama_detail.logs_col_errors")}</TableHead>
                  <TableHead>{t("lama_detail.logs_col_initiator")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setDrawerLog(log)}
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(new Date(log.started_at), locale)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {log.duration_ms ? formatDuration(log.duration_ms) : "—"}
                    </TableCell>
                    <TableCell><SyncTypeBadge type={log.type} /></TableCell>
                    <TableCell><SyncStatusBadge status={log.status} /></TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {log.records_created !== undefined && log.records_updated !== undefined
                        ? `+${log.records_created} / ~${log.records_updated}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {(log.error_count ?? 0) > 0 ? (
                        <span className="text-sm text-destructive tabular-nums">{log.error_count}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.initiator_name ?? t("lama_detail.logs_initiator_schedule")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors space-y-1.5"
                onClick={() => setDrawerLog(log)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{formatDateTime(new Date(log.started_at), locale)}</span>
                  <div className="flex items-center gap-1.5">
                    <SyncTypeBadge type={log.type} />
                    <SyncStatusBadge status={log.status} />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {log.duration_ms && <span>{formatDuration(log.duration_ms)}</span>}
                  {log.records_created !== undefined && <span>+{log.records_created} / ~{log.records_updated}</span>}
                  {(log.error_count ?? 0) > 0 && <span className="text-destructive">{log.error_count} ошибок</span>}
                  <span>{log.initiator_name ?? t("lama_detail.logs_initiator_schedule")}</span>
                </div>
                {log.error_message && (
                  <p className="text-xs text-destructive truncate">{log.error_message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} из {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log detail drawer */}
      <Sheet open={!!drawerLog} onOpenChange={(o) => { if (!o) setDrawerLog(null); }}>
        <SheetContent className="w-full max-w-2xl overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>{t("lama_detail.logs_drawer_title")}</SheetTitle>
          </SheetHeader>
          {drawerLog && (
            <div className="mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Начало</p>
                  <p className="font-medium">{formatDateTime(new Date(drawerLog.started_at), locale)}</p>
                </div>
                {drawerLog.ended_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Окончание</p>
                    <p className="font-medium">{formatDateTime(new Date(drawerLog.ended_at), locale)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Тип</p>
                  <SyncTypeBadge type={drawerLog.type} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Статус</p>
                  <SyncStatusBadge status={drawerLog.status} />
                </div>
                {drawerLog.duration_ms && (
                  <div>
                    <p className="text-xs text-muted-foreground">Длительность</p>
                    <p className="font-medium">{formatDuration(drawerLog.duration_ms)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Инициатор</p>
                  <p className="font-medium">{drawerLog.initiator_name ?? t("lama_detail.logs_initiator_schedule")}</p>
                </div>
                {drawerLog.records_created !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Создано / Обновлено</p>
                    <p className="font-medium">+{drawerLog.records_created} / ~{drawerLog.records_updated}</p>
                  </div>
                )}
                {(drawerLog.error_count ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Ошибок</p>
                    <p className="font-medium text-destructive">{drawerLog.error_count}</p>
                  </div>
                )}
              </div>

              {drawerLog.error_message && (
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1.5">{t("lama_detail.logs_drawer_errors")}</p>
                  <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3">
                    <p className="text-sm text-destructive">{drawerLog.error_message}</p>
                    {drawerLog.error_details && (
                      <ul className="mt-2 space-y-0.5">
                        {drawerLog.error_details.map((d, i) => (
                          <li key={i} className="text-xs text-destructive/80 font-mono">{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {drawerLog.payload_json && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t("lama_detail.logs_drawer_payload")}</p>
                  <pre className="whitespace-pre-wrap text-xs font-mono bg-muted rounded-md p-3 overflow-x-auto">
                    {JSON.stringify(drawerLog.payload_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function LamaDetail() {
  const t = useTranslations("screen.integrations");
  const locale = useLocale() as Locale;
  const [tab, setTab] = React.useState("status");
  const [connection, setConnection] = React.useState<LamaConnection | null>(null);
  const [loading, setLoading] = React.useState(true);

  const LAMA_HEALTH: "connected" | "degraded" | "disconnected" = "connected";
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
