"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Database,
  FileSpreadsheet,
  Webhook,
  Code,
  RefreshCw,
  ExternalLink,
  Upload,
  ShoppingCart,
  Package,
  Truck,
  Tag,
  Send,
  Cable,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  X,
  Loader2,
  Info,
  Wallet,
  Zap,
  Wrench,
  Settings,
  Clock,
} from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { PageHeader } from "@/components/shared/page-header";

import {
  getIntegrationsStatus,
  getWebhooks,
  getExcelImportHistory,
  syncLamaForce,
  uploadExcel,
  createWebhook,
  connectNominalAccount,
} from "@/lib/api/integrations";
import type {
  IntegrationsStatus,
  Webhook as WebhookType,
  ExcelImportEvent,
  NominalAccountStatus,
  NominalAccountConfig,
  NominalAccountInfo,
} from "@/lib/api/integrations";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ExternalHrCard } from "@/components/features/integrations/external-hr-card";

// ═══════════════════════════════════════════════════════════════════
// MOCK ORG (fashion detection)
// ═══════════════════════════════════════════════════════════════════

const MOCK_ORG = {
  id: "org-spar",
  business_vertical: "FMCG_RETAIL" as "FMCG_RETAIL" | "FASHION_RETAIL",
  payment_mode: "NOMINAL_ACCOUNT" as "NOMINAL_ACCOUNT" | "CLIENT_DIRECT",
  freelance_module_enabled: true,
};

// ═══════════════════════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════════════════════

type LamaHealth = "connected" | "degraded" | "disconnected";

function LamaStatusBadge({
  health,
  t,
}: {
  health: LamaHealth;
  t: ReturnType<typeof useTranslations>;
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

function AiSourceStatusBadge({ connected }: { connected: boolean }) {
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
// STAT CARD MINI
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
// EXCEL UPLOAD DIALOG
// ═══════════════════════════════════════════════════════════════════

function ExcelUploadDialog({
  open,
  onOpenChange,
  onDone,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [uploadType, setUploadType] = React.useState<"EMPLOYEES" | "SCHEDULE" | "STORES">("SCHEDULE");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      await uploadExcel(file, uploadType);
      toast.success(t("toasts.excel_uploaded"));
      onDone();
      onOpenChange(false);
      setFile(null);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cards.excel.upload_dialog_title")}</DialogTitle>
          <DialogDescription>{t("cards.excel.upload_dialog_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("cards.excel.upload_type_label")}</Label>
            <Select value={uploadType} onValueChange={(v) => setUploadType(v as typeof uploadType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEES">{t("cards.excel.type_EMPLOYEES")}</SelectItem>
                <SelectItem value="SCHEDULE">{t("cards.excel.type_SCHEDULE")}</SelectItem>
                <SelectItem value="STORES">{t("cards.excel.type_STORES")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <Upload className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-foreground">{t("cards.excel.drop_hint")}</p>
              <p className="text-xs text-muted-foreground">{t("cards.excel.drop_hint_sub")}</p>
            </div>
            {file && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs">
                <FileSpreadsheet className="size-3.5 text-success" />
                <span className="font-medium truncate max-w-48">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button disabled={!file || uploading} onClick={handleUpload}>
              {uploading && <Loader2 className="size-4 animate-spin" />}
              {t("cards.excel.upload")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXCEL HISTORY DIALOG
// ═══════════════════════════════════════════════════════════════════

function ExcelHistoryDialog({
  open,
  onOpenChange,
  history,
  locale,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  history: ExcelImportEvent[];
  locale: Locale;
  t: ReturnType<typeof useTranslations>;
}) {
  function statusBadge(status: ExcelImportEvent["status"]) {
    if (status === "SUCCESS")
      return <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-xs">Успех</Badge>;
    if (status === "PARTIAL")
      return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5 text-xs">Частично</Badge>;
    return <Badge variant="destructive" className="text-xs">Ошибка</Badge>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("cards.excel.history_dialog_title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Нет данных</p>
          ) : (
            history.map((imp) => (
              <div key={imp.id} className="flex items-start justify-between gap-3 rounded-md p-2 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="size-4 text-success shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{imp.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`cards.excel.type_${imp.type}`)} · {imp.uploaded_by_name} · {formatDateTime(new Date(imp.uploaded_at), locale)}
                    </p>
                    {imp.error_summary && (
                      <p className="text-xs text-warning mt-0.5">{imp.error_summary}</p>
                    )}
                  </div>
                </div>
                {statusBadge(imp.status)}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK ADD DIALOG
// ═══════════════════════════════════════════════════════════════════

const WEBHOOK_EVENT_OPTIONS = [
  "task.created", "task.completed", "task.approved", "task.rejected",
  "shift.opened", "shift.closed", "goal.activated", "goal.completed",
];

function WebhookAddDialog({
  open,
  onOpenChange,
  onDone,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [events, setEvents] = React.useState<string[]>(["task.completed"]);
  const [saving, setSaving] = React.useState(false);

  function toggleEvent(ev: string) {
    setEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  }

  async function handleSave() {
    if (!url || events.length === 0) return;
    setSaving(true);
    try {
      await createWebhook({ name: name || url, url, events: events as WebhookType["events"], secret, active });
      toast.success(t("toasts.webhook_created"));
      onDone();
      onOpenChange(false);
      setName(""); setUrl(""); setSecret(""); setEvents(["task.completed"]);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cards.webhooks.add_dialog_title")}</DialogTitle>
          <DialogDescription>{t("cards.webhooks.add_dialog_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("cards.webhooks.field_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Мой webhook" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("cards.webhooks.field_url")} <span className="text-destructive">*</span></Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" type="url" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("cards.webhooks.field_secret")}</Label>
            <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Необязательно" />
          </div>
          <div className="space-y-2">
            <Label>{t("cards.webhooks.field_events")} <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-1.5">
              {WEBHOOK_EVENT_OPTIONS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <Checkbox
                    checked={events.includes(ev)}
                    onCheckedChange={() => toggleEvent(ev)}
                    id={`ev-${ev}`}
                  />
                  <span className="truncate font-mono text-xs">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} id="wh-active" />
            <Label htmlFor="wh-active">{t("cards.webhooks.field_active")}</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button disabled={!url || events.length === 0 || saving} onClick={handleSave}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI SOURCE CONNECTOR SHEET
// ═══════════════════════════════════════════════════════════════════

interface SftpCheckResult {
  filename: string;
  found: boolean;
  updated_at?: string;
}

function ConnectorSheet({
  open,
  onOpenChange,
  title,
  onSave,
  t,
  showDataOptions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onSave: () => void;
  t: ReturnType<typeof useTranslations>;
  showDataOptions?: Array<{ id: string; label: string }>;
}) {
  const [tab, setTab] = React.useState<"sftp" | "api">("sftp");
  // SFTP fields
  const [sftpHost, setSftpHost] = React.useState("");
  const [sftpPort, setSftpPort] = React.useState("22");
  const [sftpUser, setSftpUser] = React.useState("");
  const [sftpPassword, setSftpPassword] = React.useState("");
  const [sftpPath, setSftpPath] = React.useState("/data/wfm");
  const [sftpChecking, setSftpChecking] = React.useState(false);
  const [sftpResults, setSftpResults] = React.useState<SftpCheckResult[] | null>(null);
  // API fields
  const [apiUrl, setApiUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [tenantId, setTenantId] = React.useState("");
  const [apiSources, setApiSources] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const csvTemplates = ["касса.csv", "остатки.csv", "поставки.csv", "промо.csv"];

  async function handleSftpCheck() {
    setSftpChecking(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSftpResults([
      { filename: "касса.csv", found: true, updated_at: "28 апр, 06:00" },
      { filename: "остатки.csv", found: true, updated_at: "28 апр, 06:00" },
      { filename: "поставки.csv", found: false },
      { filename: "промо.csv", found: false },
    ]);
    setSftpChecking(false);
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success(t("toasts.connector_saved"));
    onSave();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Выберите режим подключения</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "sftp" | "api")} className="mt-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sftp" className="gap-1.5">
              {t("ai_sources.connector_sheet_title_sftp")}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{t("ai_sources.connector_sheet_sftp_recommended")}</Badge>
            </TabsTrigger>
            <TabsTrigger value="api">{t("ai_sources.connector_sheet_title_api")}</TabsTrigger>
          </TabsList>

          <TabsContent value="sftp" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>SFTP host</Label>
                <Input value={sftpHost} onChange={(e) => setSftpHost(e.target.value)} placeholder="sftp.example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input value={sftpPort} onChange={(e) => setSftpPort(e.target.value)} placeholder="22" />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={sftpUser} onChange={(e) => setSftpUser(e.target.value)} placeholder="wfm_user" />
              </div>
              <div className="space-y-1.5">
                <Label>Password / SSH key</Label>
                <Input value={sftpPassword} onChange={(e) => setSftpPassword(e.target.value)} type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Путь к директории</Label>
                <Input value={sftpPath} onChange={(e) => setSftpPath(e.target.value)} placeholder="/data/wfm" className="font-mono text-xs" />
              </div>
            </div>

            <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => {
              const a = document.createElement("a");
              a.href = "#";
              toast("Шаблоны скачаны: " + csvTemplates.join(", "), { duration: 4000 });
            }}>
              <Download className="size-3.5" />
              {t("ai_sources.connector_sftp_download_templates")}
            </Button>

            <p className="text-xs text-muted-foreground leading-relaxed rounded-md bg-muted/50 p-3">
              {t("ai_sources.connector_sftp_hint")}
            </p>

            {sftpResults && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("ai_sources.connector_sftp_found")}:</p>
                {sftpResults.map((r) => (
                  <div key={r.filename} className="flex items-center gap-2 text-sm">
                    {r.found ? (
                      <CheckCircle2 className="size-4 text-success shrink-0" />
                    ) : (
                      <XCircle className="size-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-mono">{r.filename}</span>
                    {r.found && r.updated_at ? (
                      <span className="text-xs text-muted-foreground ml-auto">{r.updated_at}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground ml-auto">{t("ai_sources.connector_sftp_not_found")}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleSftpCheck} disabled={sftpChecking} className="gap-2">
                {sftpChecking ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {t("ai_sources.connector_sftp_check")}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://erp.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder="••••••••••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Tenant ID <span className="text-muted-foreground text-xs">(опц.)</span></Label>
              <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="client-001" />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed rounded-md bg-muted/50 p-3">
              {t("ai_sources.connector_api_note")}
            </p>

            {showDataOptions && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t("ai_sources.connector_api_sources_label")}:</Label>
                {showDataOptions.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={apiSources.includes(opt.id)}
                      onCheckedChange={(c) => setApiSources((prev) => c ? [...prev, opt.id] : prev.filter((s) => s !== opt.id))}
                      id={`api-src-${opt.id}`}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving || !apiUrl} className="w-full gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Сохранить
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SIMPLE CONNECTOR SHEET (for single data source)
// ═══════════════════════════════════════════════════════════════════

function SimpleConnectorSheet({
  open,
  onOpenChange,
  title,
  extraFields,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  extraFields?: React.ReactNode;
  onSave: () => void;
}) {
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success("Коннектор сохранён");
    onSave();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {extraFields}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Сохранить
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOMINAL ACCOUNT SHEET
// ═══════════════════════════════════════════════════════════════════

function NominalAccountSheet({
  open,
  onOpenChange,
  mode,
  existingConfig,
  lastTransactionStatus,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "connect" | "settings";
  existingConfig?: { endpoint_url: string; api_key_masked: string; client_id: string };
  lastTransactionStatus?: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("screen.integrations.nominal_sheet");
  const tToast = useTranslations("screen.integrations.toasts");
  const tCommon = useTranslations("common");
  const [endpointUrl, setEndpointUrl] = React.useState(existingConfig?.endpoint_url ?? "");
  const [apiKey, setApiKey] = React.useState("");
  const [clientId, setClientId] = React.useState(existingConfig?.client_id ?? "");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEndpointUrl(existingConfig?.endpoint_url ?? "");
      setApiKey("");
      setClientId(existingConfig?.client_id ?? "");
    }
  }, [open, existingConfig]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await connectNominalAccount({
        endpoint_url: endpointUrl,
        api_key: apiKey,
        client_id: clientId,
      } satisfies NominalAccountConfig);
      if (result.success) {
        toast.success(tToast("nominal_connected"));
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error?.message ?? tToast("error"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {mode === "settings" && lastTransactionStatus && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground text-xs mb-1">{t("last_transaction_label")}</p>
              <p className="font-medium">{lastTransactionStatus}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="na-endpoint">{t("endpoint_label")}</Label>
              <Input
                id="na-endpoint"
                type="url"
                placeholder="https://api.nominalaccount.ru/v2"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="na-apikey">
                {t("api_key_label")}
                {mode === "settings" && existingConfig?.api_key_masked && (
                  <span className="ml-2 text-muted-foreground text-xs font-normal">
                    {existingConfig.api_key_masked}
                  </span>
                )}
              </Label>
              <Input
                id="na-apikey"
                type="password"
                placeholder="sk-••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required={mode === "connect"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="na-clientid">{t("client_id_label")}</Label>
              <Input
                id="na-clientid"
                placeholder="org-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>

            <Separator />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                {t("save")}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOMINAL ACCOUNT CARD
// ═══════════════════════════════════════════════════════════════════

function NominalAccountCard({ info, onRefresh }: { info: NominalAccountInfo; onRefresh: () => void }) {
  const t = useTranslations("screen.integrations.cards.nominal_account");
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const statusBadgeClass: Record<NominalAccountStatus, string> = {
    CONNECTED: "text-success border-success/30 bg-success/5",
    NOT_CONNECTED: "text-muted-foreground border-border",
    ERROR: "text-destructive border-destructive/30 bg-destructive/5",
  };
  const statusLabel: Record<NominalAccountStatus, string> = {
    CONNECTED: t("status_connected"),
    NOT_CONNECTED: t("status_not_connected"),
    ERROR: t("status_error"),
  };

  const buttonLabel =
    info.status === "NOT_CONNECTED"
      ? t("connect")
      : info.status === "ERROR"
      ? t("fix")
      : t("configure");

  const ButtonIcon =
    info.status === "NOT_CONNECTED" ? Zap : info.status === "ERROR" ? Wrench : Settings;

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <Wallet className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-foreground">{t("title")}</p>
                <p className="text-xs text-muted-foreground leading-snug">{t("description")}</p>
              </div>
            </div>
            <Badge variant="outline" className={cn("shrink-0", statusBadgeClass[info.status])}>
              {statusLabel[info.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-3 space-y-3">
          {info.status === "CONNECTED" && info.stats && (
            <div className="grid grid-cols-1 gap-1.5">
              <StatItem
                label={t("stat_paid_30d")}
                value={`${info.stats.paid_last_30d_rub.toLocaleString("ru-RU")} ₽`}
              />
              <StatItem label={t("stat_errors")} value={info.stats.error_count} />
              <StatItem label={t("stat_docs")} value={info.stats.documents_generated} />
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

          {info.status === "NOT_CONNECTED" && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 border p-3 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0 mt-0.5" />
              <span>Сервис доступен для подключения. Требуются API ключи от провайдера.</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            variant={info.status === "ERROR" ? "destructive" : "default"}
            onClick={() => setSheetOpen(true)}
            className="gap-2"
          >
            <ButtonIcon className="size-3.5" />
            {buttonLabel}
          </Button>
        </CardFooter>
      </Card>

      <NominalAccountSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={info.status === "NOT_CONNECTED" ? "connect" : "settings"}
        existingConfig={info.config}
        lastTransactionStatus={info.last_transaction_status}
        onSuccess={onRefresh}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function HubSkeleton() {
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

  // Dialogs
  const [excelUploadOpen, setExcelUploadOpen] = React.useState(false);
  const [excelHistoryOpen, setExcelHistoryOpen] = React.useState(false);
  const [webhookAddOpen, setWebhookAddOpen] = React.useState(false);

  // AI source connector sheets
  const [posSheetOpen, setPosSheetOpen] = React.useState(false);
  const [inventorySheetOpen, setInventorySheetOpen] = React.useState(false);
  const [supplySheetOpen, setSupplySheetOpen] = React.useState(false);
  const [promoSheetOpen, setPromoSheetOpen] = React.useState(false);
  const [marketingSheetOpen, setMarketingSheetOpen] = React.useState(false);
  const [universalSheetOpen, setUniversalSheetOpen] = React.useState(false);

  // LAMA syncing
  const [syncing, setSyncing] = React.useState(false);

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

  async function handleLamaSync() {
    setSyncing(true);
    try {
      await syncLamaForce();
      toast.success(t("toasts.lama_synced"));
      const res = await getIntegrationsStatus();
      setStatus(res.data);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSyncing(false);
    }
  }

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
  const _lamaLastSyncFull = status.lama.last_sync_at
    ? formatDateTime(new Date(status.lama.last_sync_at), locale)
    : "—";

  const excelLastUpload = status.excel.last_upload_at
    ? formatDateTime(new Date(status.excel.last_upload_at), locale)
    : "—";

  const recentExcel = excelHistory.slice(0, 3);

  // Count connected AI sources (mock: only POS connected for FMCG)
  const connectedAiSources = isFashion ? 0 : 1; // POS is "connected" for FMCG demo
  const _totalAiSources = isFashion ? 5 : 4; // Marketing channel only for fashion

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

          {/* LAMA Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Database className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{t("cards.lama.title")}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{t("cards.lama.description")}</p>
                  </div>
                </div>
                <LamaStatusBadge health={lamaHealth} t={t} />
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <StatItem label={t("cards.lama.stat_users")} value={status.lama.users_synced_count ?? 47} />
                <StatItem label={t("cards.lama.stat_stores")} value={status.lama.stores_synced_count ?? 8} />
                <StatItem label={t("cards.lama.stat_shifts")} value={status.lama.shifts_synced_count} />
                <StatItem
                  label={t("cards.lama.stat_last_sync")}
                  value={lamaLastSync}
                />
              </div>
            </CardContent>
            <CardFooter className="gap-2 border-t border-border pt-3">
              <Button asChild size="sm">
                <Link href={ADMIN_ROUTES.integrations + "/lama"}>{t("cards.lama.open")}</Link>
              </Button>
              <Button variant="outline" size="sm" disabled={syncing} onClick={handleLamaSync} className="gap-2">
                <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
                {t("cards.lama.sync_now")}
              </Button>
            </CardFooter>
          </Card>

          {/* Excel Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success shrink-0">
                  <FileSpreadsheet className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{t("cards.excel.title")}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{t("cards.excel.description")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3 space-y-3">
              <div className="grid grid-cols-1 gap-1.5">
                <StatItem
                  label={t("cards.excel.monthly_imports")}
                  value={status.excel.monthly_imports_count ?? "—"}
                />
                {status.excel.last_upload_at && (
                  <StatItem
                    label={t("cards.excel.last_import")}
                    value={`${excelLastUpload}${status.excel.last_upload_by_name ? ` — ${status.excel.last_upload_by_name}` : ""}`}
                  />
                )}
              </div>
              {recentExcel.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("cards.excel.history_title")}</p>
                  {recentExcel.map((imp) => (
                    <div key={imp.id} className="flex items-center gap-2 text-xs">
                      <FileSpreadsheet className="size-3 text-muted-foreground shrink-0" />
                      <span className="truncate text-muted-foreground min-w-0">{imp.file_name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] ml-auto shrink-0",
                          imp.status === "SUCCESS" && "text-success border-success/30",
                          imp.status === "PARTIAL" && "text-warning border-warning/30",
                          imp.status === "ERROR" && "text-destructive border-destructive/30",
                        )}
                      >
                        {imp.status === "SUCCESS" ? "Успех" : imp.status === "PARTIAL" ? "Частично" : "Ошибка"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="gap-2 border-t border-border pt-3">
              <Button size="sm" onClick={() => setExcelUploadOpen(true)} className="gap-2">
                <Upload className="size-3.5" />
                {t("cards.excel.upload")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExcelHistoryOpen(true)}>
                История
              </Button>
            </CardFooter>
          </Card>

          {/* Webhooks Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-info/10 text-info shrink-0">
                  <Webhook className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{t("cards.webhooks.title")}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{t("cards.webhooks.description")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <StatItem label={t("cards.webhooks.stat_active")} value={status.webhooks.active} />
                <StatItem label={t("cards.webhooks.delivered_today")} value={status.webhooks.delivered_today ?? "—"} />
                <StatItem label={t("cards.webhooks.stat_failing")} value={status.webhooks.failing} />
              </div>
              <div className="space-y-1.5">
                {webhooks.slice(0, 3).map((wh) => (
                  <div key={wh.id} className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full shrink-0", wh.active ? "bg-success" : "bg-muted-foreground/30")} />
                    <span className="text-xs text-muted-foreground truncate min-w-0">{wh.url}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="gap-2 border-t border-border pt-3">
              <Button size="sm" onClick={() => setWebhookAddOpen(true)} className="gap-2">
                <Plus className="size-3.5" />
                {t("cards.webhooks.add")}
              </Button>
              <Button variant="outline" size="sm">
                {t("cards.webhooks.all")}
              </Button>
            </CardFooter>
          </Card>

          {/* Public API Card */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground shrink-0">
                  <Code className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{t("cards.api_keys.title")}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{t("cards.api_keys.description")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <StatItem label={t("cards.api_keys.stat_keys")} value={status.api_keys_count} />
                <StatItem label={t("cards.api_keys.stat_requests")} value={status.api_requests_today ?? "—"} />
              </div>
            </CardContent>
            <CardFooter className="gap-2 border-t border-border pt-3">
              <Button asChild variant="outline" size="sm">
                <Link href={ADMIN_ROUTES.settingsOrganization + "?tab=api-keys"}>{t("cards.api_keys.manage")}</Link>
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="size-3.5" />
                {t("cards.api_keys.docs")}
              </Button>
            </CardFooter>
          </Card>

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
      <section aria-label="Источники данных для ИИ">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("ai_sources.section_title")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t("ai_sources.section_subtitle")}</p>
          </div>

          {/* Demo hint alert */}
          {connectedAiSources === 0 && (
            <Alert className="border-info/30 bg-info/5">
              <Info className="size-4 text-info" />
              <AlertDescription className="text-sm">
                {t("ai_sources.hint_demo_alert")}{" "}
                <Link
                  href={ADMIN_ROUTES.aiChat + "?context_type=general"}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  {t("ai_sources.hint_demo_link")}
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {/* POS Card */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-info/10 text-info shrink-0">
                      <ShoppingCart className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{t("ai_sources.pos.title")}</p>
                    </div>
                  </div>
                  <AiSourceStatusBadge connected={!isFashion} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.pos.description")}</p>
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <div className="grid grid-cols-2 gap-2">
                  <StatItem label={t("ai_sources.pos.stat_checks")} value={!isFashion ? "124 567" : "—"} />
                  <StatItem label={t("ai_sources.pos.stat_stores")} value={!isFashion ? "1 / 8" : "—"} />
                  <StatItem label={t("ai_sources.pos.stat_last_check")} value={!isFashion ? "2 мин назад" : "—"} />
                  <StatItem label={t("ai_sources.pos.stat_avg_check")} value={!isFashion ? "1 240 ₽" : "—"} />
                </div>
              </CardContent>
              <CardFooter className="gap-2 border-t border-border pt-2">
                <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setPosSheetOpen(true)}>
                  {t("ai_sources.connect")}
                </Button>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                  {t("ai_sources.docs")}
                </Button>
              </CardFooter>
            </Card>

            {/* Inventory Card */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-warning/10 text-warning shrink-0">
                      <Package className="size-4" />
                    </span>
                    <p className="text-sm font-semibold">{t("ai_sources.inventory.title")}</p>
                  </div>
                  <AiSourceStatusBadge connected={false} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.inventory.description")}</p>
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <div className="grid grid-cols-2 gap-2">
                  <StatItem label={t("ai_sources.inventory.stat_sku")} value="—" />
                  <StatItem label={t("ai_sources.inventory.stat_interval")} value="—" />
                  <StatItem label={t("ai_sources.inventory.stat_last_update")} value="—" />
                </div>
              </CardContent>
              <CardFooter className="gap-2 border-t border-border pt-2">
                <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setInventorySheetOpen(true)}>
                  {t("ai_sources.connect")}
                </Button>
              </CardFooter>
            </Card>

            {/* Supply Card */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-success/10 text-success shrink-0">
                      <Truck className="size-4" />
                    </span>
                    <p className="text-sm font-semibold">{t("ai_sources.supply.title")}</p>
                  </div>
                  <AiSourceStatusBadge connected={false} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.supply.description")}</p>
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <div className="grid grid-cols-2 gap-2">
                  <StatItem label={t("ai_sources.supply.stat_suppliers")} value="—" />
                  <StatItem label={t("ai_sources.supply.stat_week")} value="—" />
                  <StatItem label={t("ai_sources.supply.stat_last")} value="—" />
                </div>
              </CardContent>
              <CardFooter className="gap-2 border-t border-border pt-2">
                <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setSupplySheetOpen(true)}>
                  {t("ai_sources.connect")}
                </Button>
              </CardFooter>
            </Card>

            {/* Promo Card */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
                      <Tag className="size-4" />
                    </span>
                    <p className="text-sm font-semibold">{t("ai_sources.promo.title")}</p>
                  </div>
                  <AiSourceStatusBadge connected={false} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.promo.description")}</p>
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <div className="grid grid-cols-2 gap-2">
                  <StatItem label={t("ai_sources.promo.stat_active")} value="—" />
                  <StatItem label={t("ai_sources.promo.stat_tomorrow")} value="—" />
                  <StatItem label={t("ai_sources.promo.stat_today_end")} value="—" />
                </div>
              </CardContent>
              <CardFooter className="gap-2 border-t border-border pt-2">
                <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setPromoSheetOpen(true)}>
                  {t("ai_sources.connect")}
                </Button>
              </CardFooter>
            </Card>

            {/* Marketing Channel Card — fashion only */}
            {isFashion && (
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                        <Send className="size-4" />
                      </span>
                      <p className="text-sm font-semibold">{t("ai_sources.marketing_channel.title")}</p>
                    </div>
                    <AiSourceStatusBadge connected={false} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.marketing_channel.description")}</p>
                </CardHeader>
                <CardContent className="flex-1 pb-2">
                  <div className="grid grid-cols-2 gap-2">
                    <StatItem label={t("ai_sources.marketing_channel.stat_posts")} value="—" />
                    <StatItem label={t("ai_sources.marketing_channel.stat_last")} value="—" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-3 border-t border-border pt-3">
                    {t("ai_sources.marketing_channel.note")}
                  </p>
                </CardContent>
                <CardFooter className="gap-2 border-t border-border pt-2">
                  <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setMarketingSheetOpen(true)}>
                    {t("ai_sources.connect")}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* Universal Connector Card */}
            <Card className="flex flex-col bg-muted/30 border-dashed">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                    <Cable className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{t("ai_sources.connector_universal_title")}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{t("ai_sources.connector_universal_desc")}</p>
              </CardHeader>
              <CardContent className="flex-1 pb-2" />
              <CardFooter className="gap-2 border-t border-border pt-2">
                <Button size="sm" variant="default" className="gap-2 h-8 text-xs" onClick={() => setUniversalSheetOpen(true)}>
                  {t("ai_sources.configure")}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Dialogs & Sheets ──────────────────────────────────────── */}
      <ExcelUploadDialog
        open={excelUploadOpen}
        onOpenChange={setExcelUploadOpen}
        onDone={async () => {
          const res = await getExcelImportHistory();
          setExcelHistory(res.data);
        }}
        t={t}
      />

      <ExcelHistoryDialog
        open={excelHistoryOpen}
        onOpenChange={setExcelHistoryOpen}
        history={excelHistory}
        locale={locale}
        t={t}
      />

      <WebhookAddDialog
        open={webhookAddOpen}
        onOpenChange={setWebhookAddOpen}
        onDone={async () => {
          const res = await getWebhooks();
          setWebhooks(res.data);
        }}
        t={t}
      />

      {/* POS sheet */}
      <SimpleConnectorSheet
        open={posSheetOpen}
        onOpenChange={setPosSheetOpen}
        title={t("ai_sources.pos.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("ai_sources.pos.api_url_label")}</Label>
              <Input placeholder="https://pos.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ai_sources.pos.api_key_label")}</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ai_sources.pos.connector_type_label")}</Label>
              <Select defaultValue="1C">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1C">1С</SelectItem>
                  <SelectItem value="SBIS">СБИС</SelectItem>
                  <SelectItem value="KASSA">Кассовый сервис</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("ai_sources.pos.data_label")}</Label>
              {[
                { id: "checks", label: t("ai_sources.pos.data_checks") },
                { id: "returns", label: t("ai_sources.pos.data_returns") },
                { id: "shifts", label: t("ai_sources.pos.data_shifts") },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox id={`pos-${opt.id}`} defaultChecked={opt.id === "checks"} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        }
      />

      {/* Inventory sheet */}
      <SimpleConnectorSheet
        open={inventorySheetOpen}
        onOpenChange={setInventorySheetOpen}
        title={t("ai_sources.inventory.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input placeholder="https://wms.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" placeholder="•••••••••••••���••" />
            </div>
          </div>
        }
      />

      {/* Supply sheet */}
      <SimpleConnectorSheet
        open={supplySheetOpen}
        onOpenChange={setSupplySheetOpen}
        title={t("ai_sources.supply.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input placeholder="https://supply.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
          </div>
        }
      />

      {/* Promo sheet */}
      <SimpleConnectorSheet
        open={promoSheetOpen}
        onOpenChange={setPromoSheetOpen}
        title={t("ai_sources.promo.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input placeholder="https://promo.example.com/api" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
          </div>
        }
      />

      {/* Marketing Channel sheet */}
      <SimpleConnectorSheet
        open={marketingSheetOpen}
        onOpenChange={setMarketingSheetOpen}
        title={t("ai_sources.marketing_channel.sheet_title")}
        onSave={() => {}}
        extraFields={
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("ai_sources.marketing_channel.field_name")}</Label>
              <Input placeholder="Telegram-канал распродаж" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ai_sources.marketing_channel.field_url")}</Label>
              <Input placeholder="https://api.telegram.org/bot..." />
            </div>
          </div>
        }
      />

      {/* Universal connector sheet */}
      <ConnectorSheet
        open={universalSheetOpen}
        onOpenChange={setUniversalSheetOpen}
        title={t("ai_sources.connector_universal_title")}
        onSave={() => {}}
        t={t}
        showDataOptions={[
          { id: "pos", label: t("ai_sources.pos.title") },
          { id: "inventory", label: t("ai_sources.inventory.title") },
          { id: "supply", label: t("ai_sources.supply.title") },
          { id: "promo", label: t("ai_sources.promo.title") },
        ]}
      />
    </div>
  );
}
