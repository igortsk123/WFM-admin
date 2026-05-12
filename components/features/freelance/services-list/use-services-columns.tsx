"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  MoreHorizontal,
  Pencil,
  Shield,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import type { Locale, NoShowReport, Service } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge";
import { ServiceStatusBadge } from "@/components/shared/service-status-badge";
import { UserCell } from "@/components/shared/user-cell";
import { WorkTypeBadge } from "@/components/shared/work-type-badge";

import { NoShowLegalBadge } from "../service-detail-sheet";

import { formatAmount, formatDate } from "./_shared";

interface UseServicesColumnsParams {
  locale: string;
  isNominal: boolean;
  isNoShowTab: boolean;
  canConfirm: boolean;
  canAdjustAmount: boolean;
  canSendToLegal: boolean;
  noShowMap: Map<string, NoShowReport>;
  onConfirm: (service: Service) => void | Promise<void>;
  onDispute: (service: Service) => void;
  onAdjust: (service: Service) => void;
  onSendToLegal: (report: NoShowReport) => void | Promise<void>;
  onOpenDetail: (service: Service) => void;
}

export function useServicesColumns({
  locale,
  isNominal,
  isNoShowTab,
  canConfirm,
  canAdjustAmount,
  canSendToLegal,
  noShowMap,
  onConfirm,
  onDispute,
  onAdjust,
  onSendToLegal,
  onOpenDetail,
}: UseServicesColumnsParams): ColumnDef<Service>[] {
  const t = useTranslations("screen.freelanceServicesList");
  const tc = useTranslations("common");

  return useMemo<ColumnDef<Service>[]>(() => {
    const cols: ColumnDef<Service>[] = [
      {
        id: "date",
        header: t("columns.date"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.service_date, locale)}
          </span>
        ),
      },
      {
        id: "service_name",
        header: t("columns.service_name"),
        cell: ({ row }) => {
          const s = row.original;
          const name = pickLocalized(
            s.service_name,
            s.service_name_en ?? undefined,
            locale as Locale,
          );
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground truncate max-w-[260px]">
                {name}
              </span>
              <WorkTypeBadge
                workType={{
                  id: s.work_type_id,
                  name: s.work_type_name,
                }}
                size="sm"
              />
            </div>
          );
        },
      },
      {
        id: "performer",
        header: t("columns.performer"),
        cell: ({ row }) => {
          const s = row.original;
          const nameParts = s.freelancer_name.split(" ");
          const fakeUser = {
            first_name: nameParts[1] ?? "",
            last_name: nameParts[0] ?? "",
            middle_name: nameParts[2],
          };
          return (
            <div className="flex items-center gap-2 min-w-0">
              <UserCell user={fakeUser} />
              <FreelancerStatusBadge status="ACTIVE" size="sm" />
            </div>
          );
        },
      },
      {
        id: "store",
        header: t("columns.store"),
        cell: ({ row }) => (
          <span className="text-sm text-foreground max-w-[140px] truncate block">
            {row.original.store_name}
          </span>
        ),
      },
      {
        id: "hours",
        header: t("columns.hours"),
        cell: ({ row }) => {
          const s = row.original;
          // Одно значение часов: PLANNED/IN_PROGRESS/NO_SHOW — «обещано»,
          // остальные статусы — «к оплате» (финальная цифра). Детальная
          // разбивка (обещано/факт/к оплате) остаётся в sheet'е.
          const isPreOrPending =
            s.status === "PLANNED" ||
            s.status === "IN_PROGRESS" ||
            s.status === "NO_SHOW";
          const value = isPreOrPending ? s.scheduled_hours : s.payable_hours;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-sm text-foreground font-mono">{`${value} ч`}</span>
              {s.underload_not_fault && s.payable_hours > s.actual_hours && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-info/10 text-info border-transparent text-[10px] px-1 py-0 cursor-default">
                        {t("hours_badge.underload")}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {pickLocalized(
                        s.adjustment_reason ?? "",
                        s.adjustment_reason_en ?? undefined,
                        locale as Locale,
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
      {
        id: "volume",
        header: t("columns.volume"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {row.original.normative_volume}&nbsp;{row.original.normative_unit}
          </span>
        ),
      },
      {
        id: "amount",
        header: t("columns.amount"),
        cell: ({ row }) => {
          const s = row.original;
          const amount = isNominal ? s.total_amount : s.total_amount_indicative;
          if (amount == null) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-sm font-medium text-foreground font-mono">
                {formatAmount(amount, "RUB", locale)}
              </span>
              {!isNominal && (
                <span className="text-xs text-muted-foreground">
                  {t("columns.amount_indicative")}
                </span>
              )}
              {s.manually_adjusted && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Pencil className="size-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>{t("adjusted_tooltip")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
    ];

    // Agent column — only NOMINAL_ACCOUNT
    if (isNominal) {
      cols.push({
        id: "agent",
        header: t("columns.agent"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[100px] block">
            {row.original.agent_name ?? "—"}
          </span>
        ),
      });
    }

    // Source column
    cols.push({
      id: "source",
      header: t("columns.source"),
      cell: ({ row }) => {
        const hasApp = Boolean(row.original.application_id);
        return (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {t(
              (hasApp ? "source.INTERNAL" : "source.EXTERNAL") as Parameters<
                typeof t
              >[0],
            )}
          </Badge>
        );
      },
    });

    // Legal status column (no-show tab)
    if (isNoShowTab) {
      cols.push({
        id: "legal_status",
        header: t("columns.legal_status"),
        cell: ({ row }) => {
          const report = noShowMap.get(row.original.id);
          if (!report) return <span className="text-muted-foreground">—</span>;
          return <NoShowLegalBadge status={report.status} />;
        },
      });
    }

    // Status column
    cols.push({
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => <ServiceStatusBadge status={row.original.status} />,
    });

    // Actions column
    cols.push({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original;
        const noShowReport = noShowMap.get(s.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={tc("actions")}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canConfirm && s.status === "COMPLETED" && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      void onConfirm(s);
                    }}
                  >
                    <CheckCircle2 className="size-4 mr-2 text-success" />
                    {t("actions.confirm")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDispute(s);
                    }}
                  >
                    <AlertTriangle className="size-4 mr-2 text-destructive" />
                    {t("actions.dispute")}
                  </DropdownMenuItem>
                </>
              )}
              {isNominal && s.status === "PAID" && (
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <FileDown className="size-4 mr-2" />
                  {t("actions.download_act")}
                </DropdownMenuItem>
              )}
              {s.status === "NO_SHOW" && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(s);
                  }}
                >
                  <Shield className="size-4 mr-2" />
                  {t("actions.open_no_show")}
                </DropdownMenuItem>
              )}
              {canAdjustAmount && isNominal && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdjust(s);
                  }}
                >
                  <Pencil className="size-4 mr-2" />
                  {t("actions.adjust_amount")}
                </DropdownMenuItem>
              )}
              {canSendToLegal &&
                s.status === "NO_SHOW" &&
                noShowReport?.status === "OPEN" && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      void onSendToLegal(noShowReport);
                    }}
                  >
                    <Shield className="size-4 mr-2 text-info" />
                    {t("actions.to_legal")}
                  </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return cols;
  }, [
    t,
    tc,
    locale,
    isNominal,
    isNoShowTab,
    canConfirm,
    canAdjustAmount,
    canSendToLegal,
    noShowMap,
    onConfirm,
    onDispute,
    onAdjust,
    onSendToLegal,
    onOpenDetail,
  ]);
}
