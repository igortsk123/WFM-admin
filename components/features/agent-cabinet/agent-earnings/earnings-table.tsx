"use client";

import { useTranslations } from "next-intl";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";
import type { AgentEarning, Locale } from "@/lib/types";
import { EarningStatusBadge } from "./earning-status-badge";
import { formatShortDate } from "./_shared";

interface EarningsTableProps {
  rows: AgentEarning[];
  sortDir: "asc" | "desc";
  locale: Locale;
  onToggleSort: () => void;
  onRowClick: (earning: AgentEarning) => void;
  onPayoutClick: (
    payoutId: string,
    freelancerName: string,
    e: React.MouseEvent
  ) => void;
}

export function EarningsTable({
  rows,
  sortDir,
  locale,
  onToggleSort,
  onRowClick,
  onPayoutClick,
}: EarningsTableProps) {
  const t = useTranslations("screen.agentEarnings");

  return (
    <div
      className="hidden md:block rounded-xl border overflow-hidden"
      aria-label="Earnings table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-0 gap-1 text-xs font-semibold hover:bg-transparent"
                onClick={onToggleSort}
                aria-label={`Sort by date (${sortDir})`}
              >
                {t("columns.date")}
                <ArrowUpDown className="size-3" aria-hidden="true" />
              </Button>
            </TableHead>
            <TableHead className="text-xs">{t("columns.freelancer")}</TableHead>
            <TableHead className="text-xs">{t("columns.service")}</TableHead>
            <TableHead className="text-xs text-right">{t("columns.gross_base")}</TableHead>
            <TableHead className="text-xs text-right">{t("columns.commission_pct")}</TableHead>
            <TableHead className="text-xs text-right">{t("columns.commission_amount")}</TableHead>
            <TableHead className="text-xs">{t("columns.status")}</TableHead>
            <TableHead className="text-xs">{t("columns.payout")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((earning) => (
            <TableRow
              key={earning.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onRowClick(earning)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRowClick(earning);
              }}
              tabIndex={0}
              aria-label={`${earning.freelancer_name} – ${formatCurrency(earning.commission_amount, locale)}`}
            >
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatShortDate(earning.period_date, locale)}
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium text-foreground truncate block max-w-[180px]">
                  {earning.freelancer_name}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-xs">
                  {earning.service_id}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatCurrency(earning.gross_amount_base, locale)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {earning.commission_pct}%
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {formatCurrency(earning.commission_amount, locale)}
              </TableCell>
              <TableCell>
                <EarningStatusBadge
                  status={earning.status}
                  label={t(`status.${earning.status}`)}
                />
              </TableCell>
              <TableCell>
                {earning.payout_id ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs font-mono text-primary hover:underline"
                    onClick={(e) =>
                      onPayoutClick(earning.payout_id!, earning.freelancer_name, e)
                    }
                  >
                    {earning.payout_id}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
