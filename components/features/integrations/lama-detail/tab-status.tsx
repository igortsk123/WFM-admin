"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Edit,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

import {
  testLamaConnection,
  updateLamaConnection,
} from "@/lib/api/integrations";
import type { LamaConnection } from "@/lib/api/integrations";
import { formatDateTime } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";

import type { Translator } from "./_shared";

interface StatusTabProps {
  connection: LamaConnection;
  t: Translator;
  locale: Locale;
  onReload: () => void;
}

export function StatusTab({ connection, t, locale, onReload }: StatusTabProps) {
  const tCommon = useTranslations("common");
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
      toast.success(tCommon("toasts.settings_saved"));
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
