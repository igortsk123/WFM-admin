"use client";

import { useTranslations } from "next-intl";
import { Download, MoreVertical, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Payout } from "@/lib/types";

export type PayoutMenuAction = "details" | "retry" | "download";

interface RowActionsProps {
  payout: Payout;
  isReadOnly: boolean;
  onMenuAction: (action: PayoutMenuAction, id: string) => void;
}

export function RowActions({
  payout,
  isReadOnly,
  onMenuAction,
}: RowActionsProps) {
  const t = useTranslations("screen.freelancePayoutsList");
  const tCommon = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={tCommon("actions")}
          onClick={(e) => e.stopPropagation()}
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
        {payout.status === "FAILED" && !isReadOnly && (
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
  );
}
