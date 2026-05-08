"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { connectNominalAccount } from "@/lib/api/integrations";
import type {
  NominalAccountStatus,
  NominalAccountConfig,
  NominalAccountInfo,
} from "@/lib/api/integrations";
import { cn } from "@/lib/utils";

import { StatItem } from "./_shared";

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

export function NominalAccountCard({ info, onRefresh }: { info: NominalAccountInfo; onRefresh: () => void }) {
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
