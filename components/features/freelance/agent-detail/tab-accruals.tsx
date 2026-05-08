"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import type { AgentEarning } from "@/lib/types";
import { getAgentEarnings } from "@/lib/api/freelance-agents";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { DataTableShell } from "@/components/shared/data-table-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatDate, formatMoney } from "./_shared";

interface AccrualsTabProps {
  agentId: string;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}

const PAGE_SIZE = 20;

export function AccrualsTab({ agentId, t, locale }: AccrualsTabProps) {
  const [earnings, setEarnings] = React.useState<AgentEarning[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "CALCULATED" | "PAID">("ALL");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    getAgentEarnings(agentId, { page, page_size: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setEarnings(res.data);
        setTotal(res.total);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsError(true);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId, page]);

  const filtered = React.useMemo(
    () =>
      statusFilter === "ALL"
        ? earnings
        : earnings.filter((e) => e.status === statusFilter),
    [earnings, statusFilter]
  );

  // KPI summary for current page
  const accrued = filtered.reduce((s, e) => s + e.commission_amount, 0);
  const paid = filtered
    .filter((e) => e.status === "PAID")
    .reduce((s, e) => s + e.commission_amount, 0);
  const pending = accrued - paid;

  const columns: ColumnDef<AgentEarning>[] = [
    {
      id: "period_date",
      header: t("accruals_tab.col_date"),
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap text-muted-foreground">
          {formatDate(row.original.period_date, locale)}
        </span>
      ),
    },
    {
      id: "freelancer",
      header: t("accruals_tab.col_performer"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.freelancer_name}</span>
      ),
    },
    {
      id: "service",
      header: t("accruals_tab.col_service"),
      cell: ({ row }) => (
        <Link
          href={`${ADMIN_ROUTES.freelanceServices}?service_id=${row.original.service_id}`}
          className="text-xs text-primary hover:underline underline-offset-2"
        >
          {row.original.service_id}
          <ExternalLink className="inline-block ml-1 size-3" aria-hidden="true" />
        </Link>
      ),
    },
    {
      id: "base",
      header: t("accruals_tab.col_base"),
      cell: ({ row }) => (
        <span className="text-sm">{formatMoney(row.original.gross_amount_base, locale)}</span>
      ),
    },
    {
      id: "pct",
      header: t("accruals_tab.col_pct"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.commission_pct}%</span>
      ),
    },
    {
      id: "commission",
      header: t("accruals_tab.col_commission"),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatMoney(row.original.commission_amount, locale)}
        </span>
      ),
    },
    {
      id: "status",
      header: t("accruals_tab.col_status"),
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            row.original.status === "PAID"
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          )}
        >
          {row.original.status === "PAID"
            ? t("accruals_tab.status_paid")
            : t("accruals_tab.status_calculated")}
        </span>
      ),
    },
    {
      id: "payout",
      header: t("accruals_tab.col_payout"),
      cell: ({ row }) =>
        row.original.payout_id ? (
          <Link
            href={`${ADMIN_ROUTES.freelancePayouts}?payout_id=${row.original.payout_id}`}
            className="text-xs text-primary hover:underline underline-offset-2 whitespace-nowrap"
          >
            {row.original.payout_id}
            <ExternalLink className="inline-block ml-1 size-3" aria-hidden="true" />
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
  ];

  if (isError) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
        <AlertCircle className="size-4 text-destructive shrink-0" aria-hidden="true" />
        <span className="text-sm text-destructive flex-1">Не удалось загрузить начисления</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsError(false);
            setIsLoading(true);
            getAgentEarnings(agentId, { page, page_size: PAGE_SIZE })
              .then((res) => {
                setEarnings(res.data);
                setTotal(res.total);
                setIsLoading(false);
              })
              .catch(() => {
                setIsError(true);
                setIsLoading(false);
              });
          }}
        >
          <RefreshCw className="size-3.5 mr-1.5" aria-hidden="true" />
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI mini row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("accruals_tab.kpi_accrued"), value: formatMoney(accrued, locale) },
          { label: t("accruals_tab.kpi_paid"), value: formatMoney(paid, locale) },
          { label: t("accruals_tab.kpi_pending"), value: formatMoney(pending, locale) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-0.5"
          >
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {(["ALL", "CALCULATED", "PAID"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "ALL"
              ? "Все"
              : s === "PAID"
              ? t("accruals_tab.status_paid")
              : t("accruals_tab.status_calculated")}
          </Button>
        ))}
      </div>

      <DataTableShell
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
