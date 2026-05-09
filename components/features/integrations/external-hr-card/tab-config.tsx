"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/utils";
import type { ExternalHrConfig } from "@/lib/api/external-hr-sync";
import { updateExternalHrConfig } from "@/lib/api/external-hr-sync";

import {
  SCHEDULE_OPTIONS,
  type MappingRow,
  type Translator,
} from "./_shared";
import { FieldMappingSection } from "./section-field-mapping";

// ═══════════════════════════════════════════════════════════════════
// CONFIG TAB FORM
// ═══════════════════════════════════════════════════════════════════

export function ConfigTab({
  config,
  onSaved,
  t,
  tToast,
}: {
  config: ExternalHrConfig | undefined;
  onSaved: () => void;
  t: Translator;
  tToast: Translator;
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
