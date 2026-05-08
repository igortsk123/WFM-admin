"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Webhook,
  Plus,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import { createWebhook, getWebhooks } from "@/lib/api/integrations";
import type {
  IntegrationsStatus,
  Webhook as WebhookType,
} from "@/lib/api/integrations";
import { cn } from "@/lib/utils";

import { StatItem, WEBHOOK_EVENT_OPTIONS, type Translator } from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK ADD DIALOG
// ═══════════════════════════════════════════════════════════════════

export function WebhookAddDialog({
  open,
  onOpenChange,
  onDone,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  t: Translator;
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
// WEBHOOKS CARD
// ═══════════════════════════════════════════════════════════════════

interface WebhooksCardProps {
  status: IntegrationsStatus;
  webhooks: WebhookType[];
  onWebhooksUpdate: (webhooks: WebhookType[]) => void;
}

export function WebhooksCard({ status, webhooks, onWebhooksUpdate }: WebhooksCardProps) {
  const t = useTranslations("screen.integrations");
  const [webhookAddOpen, setWebhookAddOpen] = React.useState(false);

  return (
    <>
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

      <WebhookAddDialog
        open={webhookAddOpen}
        onOpenChange={setWebhookAddOpen}
        onDone={async () => {
          const res = await getWebhooks();
          onWebhooksUpdate(res.data);
        }}
        t={t}
      />
    </>
  );
}
