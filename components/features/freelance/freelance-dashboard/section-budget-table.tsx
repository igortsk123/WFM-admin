"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";

import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { BudgetUsage } from "@/lib/types";
import { cn } from "@/lib/utils";

import { BudgetMobileCard } from "./card-budget-mobile";
import { formatCurrency } from "./_shared";

interface BudgetTableProps {
  usages: BudgetUsage[];
  isSupervisor: boolean;
  isStoreDirector: boolean;
  onRowClick: (row: BudgetUsage) => void;
}

export function BudgetTable({
  usages,
  isSupervisor,
  isStoreDirector,
  onRowClick,
}: BudgetTableProps) {
  const t = useTranslations("screen.freelanceDashboard");

  const columns: ColumnDef<BudgetUsage>[] = [
    {
      accessorKey: "store_name",
      header: t("budget_table.columns.object"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground text-sm">
          {row.original.store_name}
        </span>
      ),
    },
    {
      id: "period",
      header: t("budget_table.columns.period"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.period_start.slice(0, 7)}
        </span>
      ),
    },
    {
      accessorKey: "limit_amount",
      header: t("budget_table.columns.limit"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatCurrency(row.original.limit_amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "actual_amount",
      header: t("budget_table.columns.spent"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatCurrency(row.original.actual_amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "planned_amount",
      header: t("budget_table.columns.by_plan"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatCurrency(row.original.planned_amount, row.original.currency)}
        </span>
      ),
    },
    {
      id: "overspend",
      header: t("budget_table.columns.overspend"),
      cell: ({ row }) => {
        const { overspend, overspend_pct, currency } = row.original;
        if (overspend <= 0)
          return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              overspend_pct >= 10 ? "text-destructive" : "text-warning"
            )}
          >
            +{formatCurrency(overspend, currency)} ({overspend_pct}%)
          </span>
        );
      },
    },
    {
      id: "status",
      header: t("budget_table.columns.status"),
      cell: ({ row }) => {
        const { overspend_pct } = row.original;
        if (overspend_pct >= 10)
          return (
            <Badge variant="destructive" className="text-xs">
              Перерасход
            </Badge>
          );
        if (overspend_pct > 0)
          return (
            <Badge
              className="text-xs bg-warning/10 text-warning border-warning/20"
              variant="outline"
            >
              Предупреждение
            </Badge>
          );
        return (
          <Badge
            className="text-xs bg-success/10 text-success border-success/20"
            variant="outline"
          >
            В норме
          </Badge>
        );
      },
    },
  ];

  return (
    <section aria-label="Бюджеты по объектам">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("budget_table.title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveDataTable
            columns={columns}
            data={usages}
            isLoading={false}
            isEmpty={usages.length === 0}
            emptyMessage={{
              title: "Лимиты бюджета не настроены",
              description: isSupervisor
                ? "Обратитесь к региональному менеджеру для настройки лимитов."
                : "Настройте лимиты бюджета для объектов.",
            }}
            onRowClick={(row) => onRowClick(row)}
            mobileCardRender={(row) => (
              <BudgetMobileCard row={row} onClick={() => onRowClick(row)} />
            )}
            className="[&_tr]:cursor-pointer"
          />

          {/* Empty state CTA for REGIONAL+ */}
          {usages.length === 0 && !isSupervisor && !isStoreDirector && (
            <div className="flex justify-center py-4">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={ADMIN_ROUTES.freelanceBudgetLimits}>
                  <Plus className="size-4" aria-hidden="true" />
                  Настроить лимит
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
