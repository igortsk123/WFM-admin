"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Download, MoreVertical, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityMobileCard } from "@/components/shared/entity-mobile-card";
import { PayoutStatusBadge } from "@/components/shared/payout-status-badge";
import { UserCell } from "@/components/shared/user-cell";
import type { Payout } from "@/lib/types";

import { formatCurrency, formatDate, freelancerToUser } from "./_shared";
import type { PayoutMenuAction } from "./row-actions";

interface MobileCardProps {
  payout: Payout;
  onMenuAction: (action: PayoutMenuAction, id: string) => void;
}

export const MobileCard = React.memo(function MobileCard({ payout, onMenuAction }: MobileCardProps) {
  const t = useTranslations("screen.freelancePayoutsList");

  return (
    <EntityMobileCard
      title={<UserCell user={freelancerToUser(payout.freelancer_name)} />}
      actions={
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                aria-label={t("columns.status")}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onMenuAction("details", payout.id)}>
                {t("menu.open_details")}
              </DropdownMenuItem>
              {payout.status === "PAID" && (
                <DropdownMenuItem
                  onSelect={() => onMenuAction("download", payout.id)}
                >
                  <Download className="size-4" />
                  {t("menu.download_act")}
                </DropdownMenuItem>
              )}
              {payout.status === "FAILED" && (
                <DropdownMenuItem
                  onSelect={() => onMenuAction("retry", payout.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <RefreshCw className="size-4" />
                  {t("menu.retry")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
      meta={[
        <p key="date" className="text-xs text-muted-foreground pl-[42px]">
          {formatDate(payout.payout_date)}
        </p>,
        <div key="amount" className="flex items-center gap-2 pl-[42px]">
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(payout.net_amount)}
          </span>
          <PayoutStatusBadge status={payout.status} />
        </div>,
      ]}
    />
  );
});
