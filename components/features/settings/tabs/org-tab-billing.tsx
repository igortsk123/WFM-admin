"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CreditCard, Download, Users, Store, CheckSquare } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import { getBillingConfig } from "@/lib/api/organization";
import type { BillingConfig, BillingHistoryEntry } from "@/lib/api/organization";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(rub: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(rub);
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  used: number;
  limit?: number;
}

function StatCard({ icon: Icon, label, used, limit }: StatCardProps) {
  const pct = limit ? Math.round((used / limit) * 100) : null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{used}</p>
            {limit && (
              <p className="text-xs text-muted-foreground">
                из {limit} ({pct}%)
              </p>
            )}
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="size-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OrgTabBillingProps {
  orgId: string;
}

export function OrgTabBilling({ orgId }: OrgTabBillingProps) {
  const t = useTranslations("screen.organizationSettings");
  const [billing, setBilling] = React.useState<BillingConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cancelAlertOpen, setCancelAlertOpen] = React.useState(false);

  React.useEffect(() => {
    getBillingConfig(orgId).then((res) => {
      setBilling(res.data);
      setLoading(false);
    });
  }, [orgId]);

  async function handleCancelSubscription() {
    toast.success("Заявка на отмену подписки отправлена");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!billing) return null;

  const statusConfig: Record<BillingHistoryEntry["status"], { label: string; variant: "default" | "secondary" | "destructive" }> = {
    PAID:    { label: t("billing.status_paid"),    variant: "default" },
    PENDING: { label: t("billing.status_pending"), variant: "secondary" },
    FAILED:  { label: t("billing.status_failed"),  variant: "destructive" },
  };

  return (
    <div className="space-y-6">
      {/* Current plan card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("billing.current_plan_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="text-xs">Pro</Badge>
              </div>
              <p className="text-3xl font-bold tabular-nums">
                {formatAmount(billing.price_rub)}
                <span className="text-base font-normal text-muted-foreground">/мес</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t("billing.next_charge")} {formatDate(billing.next_charge_date)}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Button variant="outline" size="sm" onClick={() => toast.info("Смена тарифа — soon")}>
                {t("billing.change_plan")}
              </Button>
              <AlertDialog open={cancelAlertOpen} onOpenChange={setCancelAlertOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    {t("billing.cancel_sub")}
                  </Button>
                </AlertDialogTrigger>
                <ConfirmDialog
                  title={t("billing.cancel_confirm_title")}
                  message={t("billing.cancel_confirm_message")}
                  confirmLabel={t("billing.cancel_confirm_action")}
                  variant="destructive"
                  onConfirm={handleCancelSubscription}
                  onOpenChange={setCancelAlertOpen}
                />
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Store}
          label={t("billing.stores_stat")}
          used={billing.stores_used}
          limit={billing.stores_limit}
        />
        <StatCard
          icon={Users}
          label={t("billing.users_stat")}
          used={billing.active_users_used}
          limit={billing.active_users_limit}
        />
        <StatCard
          icon={CheckSquare}
          label={t("billing.tasks_stat")}
          used={billing.tasks_this_month}
        />
      </div>

      {/* Payment method */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("billing.payment_method_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          {billing.payment_method ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="size-5 text-muted-foreground" />
                <span className="text-sm">
                  {billing.payment_method.type} ···· {billing.payment_method.last4}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info("Смена карты — soon")}>
                {t("billing.change_card")}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm">{t("billing.change_card")}</Button>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("billing.history_card")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveDataTable
            data={billing.history}
            columns={[
              {
                accessorKey: "date",
                header: t("billing.col_date"),
                cell: ({ row }) => (
                  <span className="text-sm">{formatDate(row.original.date)}</span>
                ),
              },
              {
                accessorKey: "amount_rub",
                header: t("billing.col_amount"),
                cell: ({ row }) => (
                  <span className="text-sm font-medium tabular-nums">
                    {formatAmount(row.original.amount_rub)}
                  </span>
                ),
              },
              {
                accessorKey: "status",
                header: t("billing.col_status"),
                cell: ({ row }) => {
                  const cfg = statusConfig[row.original.status];
                  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
                },
              },
              {
                id: "invoice",
                header: t("billing.col_invoice"),
                cell: ({ row }) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => toast.info(`Скачивание ${row.original.id}...`)}
                  >
                    <Download className="size-3" />
                    {t("billing.download_pdf")}
                  </Button>
                ),
              },
            ]}
            mobileCardRender={(entry) => {
              const cfg = statusConfig[entry.status];
              return (
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium tabular-nums">{formatAmount(entry.amount_rub)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => toast.info(`Скачивание ${entry.id}...`)}
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
