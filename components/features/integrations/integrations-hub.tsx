"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getIntegrationsStatus,
  connectNominalAccount,
  type NominalAccountConfig,
  type NominalAccountStatus,
} from "@/lib/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Key,
  RefreshCw,
  Settings,
  Wallet,
  Webhook,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

function StatusBadge({
  status,
}: {
  status: "connected" | "not_connected" | "error" | "degraded";
}) {
  const map = {
    connected: {
      label: "Подключено",
      className: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    not_connected: {
      label: "Не подключено",
      className: "bg-muted text-muted-foreground border-border",
      icon: <XCircle className="h-3 w-3" />,
    },
    error: {
      label: "Ошибка",
      className: "bg-destructive/10 text-destructive border-destructive/20",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    degraded: {
      label: "Деградация",
      className: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

  const config = map[status];
  return (
    <Badge
      variant="outline"
      className={cn("flex items-center gap-1 text-xs font-medium", config.className)}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STAT ROW
// ═══════════════════════════════════════════════════════════════════

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
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
  existingConfig?: {
    endpoint_url: string;
    api_key_masked: string;
    client_id: string;
  };
  lastTransactionStatus?: string;
  onSuccess: () => void;
}) {
  const [endpointUrl, setEndpointUrl] = useState(
    existingConfig?.endpoint_url ?? ""
  );
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState(
    existingConfig?.client_id ?? ""
  );
  const [loading, setLoading] = useState(false);

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
        toast.success("Номинальный счёт подключён");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error?.message ?? "Не удалось подключить");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "connect" ? "Подключить Номинальный счёт" : "Настройки Номинального счёта"}
          </SheetTitle>
          <SheetDescription>
            Платёжный сервис для выплат внештатным исполнителям. Удерживает 5% комиссии, формирует
            закрывающие документы.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Last transaction status (settings mode) */}
          {mode === "settings" && lastTransactionStatus && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground text-xs mb-1">Последняя транзакция</p>
              <p className="font-medium">{lastTransactionStatus}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="na-endpoint">Endpoint URL</Label>
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
                API ключ
                {mode === "settings" && existingConfig?.api_key_masked && (
                  <span className="ml-2 text-muted-foreground text-xs font-normal">
                    Текущий: {existingConfig.api_key_masked}
                  </span>
                )}
              </Label>
              <Input
                id="na-apikey"
                type="password"
                placeholder={
                  mode === "settings" ? "Введите новый ключ для замены" : "sk-••••••••"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required={mode === "connect"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="na-clientid">Идентификатор клиента в сервисе</Label>
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
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Сохранение…
                  </>
                ) : mode === "connect" ? (
                  "Подключить"
                ) : (
                  "Сохранить"
                )}
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

function NominalAccountCard({
  info,
  canEdit,
  onRefresh,
}: {
  info: {
    status: NominalAccountStatus;
    last_transaction_status?: string;
    stats?: { paid_last_30d_rub: number; error_count: number; documents_generated: number };
    config?: { endpoint_url: string; api_key_masked: string; client_id: string };
  };
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const statusMap: Record<NominalAccountStatus, "connected" | "not_connected" | "error"> = {
    CONNECTED: "connected",
    NOT_CONNECTED: "not_connected",
    ERROR: "error",
  };

  const buttonLabel =
    info.status === "NOT_CONNECTED"
      ? "Подключить"
      : info.status === "ERROR"
      ? "Исправить"
      : "Настройки";

  const ButtonIcon =
    info.status === "NOT_CONNECTED"
      ? Zap
      : info.status === "ERROR"
      ? Wrench
      : Settings;

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Номинальный счёт</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Платёжный сервис</p>
              </div>
            </div>
            <StatusBadge status={statusMap[info.status]} />
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Платёжный сервис для внештатных исполнителей. Удерживает 5% комиссии, формирует
            закрывающие документы.
          </p>

          {/* Stats — only if CONNECTED */}
          {info.status === "CONNECTED" && info.stats && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <StatRow
                label="Выплачено за 30 дней"
                value={`${info.stats.paid_last_30d_rub.toLocaleString("ru-RU")} ₽`}
              />
              <StatRow label="Ошибок" value={info.stats.error_count} />
              <StatRow label="Документов сформировано" value={info.stats.documents_generated} />
            </div>
          )}

          {/* Error hint */}
          {info.status === "ERROR" && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/15 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Проверьте API ключ и доступность endpoint.</span>
            </div>
          )}

          {/* Not connected hint */}
          {info.status === "NOT_CONNECTED" && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 border p-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Сервис доступен для подключения. Требуются API ключи от провайдера.</span>
            </div>
          )}

          <div className="mt-auto pt-2">
            <Button
              size="sm"
              variant={info.status === "ERROR" ? "destructive" : "outline"}
              className="w-full"
              disabled={!canEdit}
              onClick={() => setSheetOpen(true)}
            >
              <ButtonIcon className="h-4 w-4 mr-2" />
              {buttonLabel}
            </Button>
            {!canEdit && (
              <p className="text-xs text-muted-foreground text-center mt-1.5">
                Только NETWORK_OPS может изменять настройки
              </p>
            )}
          </div>
        </CardContent>
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
// LAMA CARD
// ═══════════════════════════════════════════════════════════════════

function LamaCard({
  lama,
}: {
  lama: {
    connected: boolean;
    last_sync_at?: string;
    shifts_synced_count: number;
    health?: "connected" | "degraded" | "disconnected";
    error?: string;
  };
}) {
  const router = useRouter();
  const status = lama.connected
    ? lama.health === "degraded"
      ? "degraded"
      : "connected"
    : "not_connected";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">LAMA Planner</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Планировщик смен</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Синхронизация смен, сотрудников и магазинов из системы планирования рабочего времени.
        </p>

        {lama.connected && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <StatRow label="Смен синхронизировано" value={lama.shifts_synced_count} />
            {lama.last_sync_at && (
              <StatRow
                label="Последняя синхронизация"
                value={new Date(lama.last_sync_at).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            )}
          </div>
        )}

        <div className="mt-auto pt-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => router.push(ADMIN_ROUTES.integrations + "/lama" as any)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Подробнее
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXCEL CARD
// ═══════════════════════════════════════════════════════════════════

function ExcelCard({
  excel,
}: {
  excel: {
    last_upload_at?: string;
    last_upload_type?: string;
    last_upload_status?: string;
    monthly_imports_count?: number;
  };
}) {
  const statusMap: Record<string, "connected" | "not_connected" | "error"> = {
    SUCCESS: "connected",
    PARTIAL: "degraded" as any,
    ERROR: "error",
  };

  const uploadStatus = excel.last_upload_status
    ? statusMap[excel.last_upload_status] ?? "not_connected"
    : "not_connected";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Excel / CSV импорт</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Загрузка данных</p>
            </div>
          </div>
          <StatusBadge status={uploadStatus} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Массовая загрузка сотрудников, расписаний и магазинов через файлы Excel и CSV.
        </p>

        {excel.last_upload_at && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <StatRow
              label="Последний импорт"
              value={new Date(excel.last_upload_at).toLocaleDateString("ru-RU")}
            />
            {excel.last_upload_type && (
              <StatRow
                label="Тип"
                value={
                  { EMPLOYEES: "Сотрудники", SCHEDULE: "Расписание", STORES: "Магазины" }[
                    excel.last_upload_type
                  ] ?? excel.last_upload_type
                }
              />
            )}
          </div>
        )}

        <div className="mt-auto pt-2">
          <Button size="sm" variant="outline" className="w-full">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Загрузить файл
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WEBHOOKS CARD
// ═══════════════════════════════════════════════════════════════════

function WebhooksCard({
  webhooks,
}: {
  webhooks: { total: number; active: number; failing: number };
}) {
  const hasError = webhooks.failing > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Вебхуки</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Исходящие события</p>
            </div>
          </div>
          <StatusBadge status={hasError ? "error" : webhooks.active > 0 ? "connected" : "not_connected"} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Отправка событий в сторонние системы при изменении задач, смен и целей.
        </p>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <StatRow label="Всего вебхуков" value={webhooks.total} />
          <StatRow label="Активных" value={webhooks.active} />
          {webhooks.failing > 0 && (
            <StatRow label="С ошибками" value={webhooks.failing} />
          )}
        </div>

        <div className="mt-auto pt-2">
          <Button size="sm" variant="outline" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Управление
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// API KEYS CARD
// ═══════════════════════════════════════════════════════════════════

function ApiKeysCard({ count }: { count: number }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">API ключи</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Доступ к API</p>
            </div>
          </div>
          <StatusBadge status={count > 0 ? "connected" : "not_connected"} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ключи для доступа к публичному API WFM из внешних систем.
        </p>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <StatRow label="Выдано ключей" value={count} />
        </div>

        <div className="mt-auto pt-2">
          <Button size="sm" variant="outline" className="w-full">
            <Key className="h-4 w-4 mr-2" />
            Управление ключами
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HUB
// ═══════════════════════════════════════════════════════════════════

export function IntegrationsHub() {
  const { user } = useAuth();
  const isNetworkOps = user.role === "NETWORK_OPS" || user.role === "PLATFORM_ADMIN";
  const isNominalAccount =
    user.organization.payment_mode === "NOMINAL_ACCOUNT";

  const {
    data,
    isLoading,
    mutate,
  } = useSWR("integrations-status", getIntegrationsStatus, {
    revalidateOnFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.data) return null;
  const status = data.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Интеграции</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление подключениями к внешним системам
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* LAMA — always visible */}
        <LamaCard lama={status.lama} />

        {/* Excel — always visible */}
        <ExcelCard excel={status.excel} />

        {/* Webhooks — always visible */}
        <WebhooksCard webhooks={status.webhooks} />

        {/* API Keys — always visible */}
        <ApiKeysCard count={status.api_keys_count} />

        {/* Nominal Account — visible if NOMINAL_ACCOUNT payment mode */}
        {isNominalAccount && status.nominal_account && (
          <NominalAccountCard
            info={status.nominal_account}
            canEdit={isNetworkOps}
            onRefresh={() => mutate()}
          />
        )}
      </div>
    </div>
  );
}
