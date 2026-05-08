"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PayoutStatusBadge } from "@/components/shared/payout-status-badge";
import { UserCell } from "@/components/shared/user-cell";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Payout } from "@/lib/types";

import { formatCurrency, formatDate, freelancerToUser } from "./_shared";
import { RowActions, type PayoutMenuAction } from "./row-actions";

interface BuildColumnsParams {
  t: (key: string) => string;
  navigate: (url: string) => void;
  isReadOnly: boolean;
  onMenuAction: (action: PayoutMenuAction, id: string) => void;
}

export function buildColumns({
  t,
  navigate,
  isReadOnly,
  onMenuAction,
}: BuildColumnsParams): ColumnDef<Payout>[] {
  return [
    {
      accessorKey: "payout_date",
      header: t("columns.payout_date"),
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {formatDate(row.original.payout_date)}
        </span>
      ),
    },
    {
      accessorKey: "freelancer_name",
      header: t("columns.freelancer"),
      cell: ({ row }) => (
        <UserCell user={freelancerToUser(row.original.freelancer_name)} />
      ),
    },
    {
      id: "stores",
      header: t("columns.stores"),
      cell: () => <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      id: "services_count",
      header: t("columns.services_count"),
      cell: ({ row }) => (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(
              `${ADMIN_ROUTES.freelanceServices}?payout_id=${row.original.id}`,
            );
          }}
        >
          {row.original.services.length}
        </Button>
      ),
    },
    {
      id: "gross_amount",
      header: t("columns.gross_amount"),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatCurrency(row.original.gross_amount)}
        </span>
      ),
    },
    {
      id: "nominal_fee",
      header: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1 text-left">
              {t("columns.nominal_fee")}
              <Info className="size-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{t("fee_tooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="bg-muted text-muted-foreground border-border text-xs"
        >
          {formatCurrency(row.original.nominal_account_fee)}
        </Badge>
      ),
    },
    {
      id: "net_amount",
      header: t("columns.net_amount"),
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          {formatCurrency(row.original.net_amount)}
        </span>
      ),
    },
    {
      id: "agent_commission",
      header: t("columns.agent_commission"),
      cell: ({ row }) =>
        row.original.agent_commission ? (
          <span className="text-sm">
            {formatCurrency(row.original.agent_commission)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => <PayoutStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          payout={row.original}
          isReadOnly={isReadOnly}
          onMenuAction={onMenuAction}
        />
      ),
    },
  ];
}
