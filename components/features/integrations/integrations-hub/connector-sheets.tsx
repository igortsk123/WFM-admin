"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

import type { Translator, SftpCheckResult } from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// AI SOURCE CONNECTOR SHEET (universal — SFTP + API tabs)
// ═══════════════════════════════════════════════════════════════════

export function ConnectorSheet({
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
  t: Translator;
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

export function SimpleConnectorSheet({
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
