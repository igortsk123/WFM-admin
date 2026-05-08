"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  getLamaSchedule,
  saveLamaSchedule,
} from "@/lib/api/integrations";
import type { LamaScheduleConfig } from "@/lib/api/integrations";

import { TIMEZONES, type Translator } from "./_shared";

interface ScheduleTabProps {
  t: Translator;
}

export function ScheduleTab({ t }: ScheduleTabProps) {
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
