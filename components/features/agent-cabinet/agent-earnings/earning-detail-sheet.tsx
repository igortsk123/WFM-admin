"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { getMyPayoutById } from "@/lib/api/agent-cabinet";
import type { AgentEarning, Locale, Payout } from "@/lib/types";
import { EarningStatusBadge } from "./earning-status-badge";
import { formatShortDate } from "./_shared";

interface EarningDetailSheetProps {
  earning: AgentEarning | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: Locale;
}

export function EarningDetailSheet({
  earning,
  open,
  onOpenChange,
  locale,
}: EarningDetailSheetProps) {
  const t = useTranslations("screen.agentEarnings");
  const statusLabel = earning ? t(`status.${earning.status}`) : "";

  const [payout, setPayout] = useState<Payout | null>(null);
  const [, setPayoutLoading] = useState(false);

  useEffect(() => {
    if (!open || !earning?.payout_id) {
      setPayout(null);
      return;
    }
    setPayoutLoading(true);
    getMyPayoutById(earning.payout_id)
      .then((res) => setPayout(res.data))
      .catch(() => setPayout(null))
      .finally(() => setPayoutLoading(false));
  }, [open, earning?.payout_id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-sm sm:max-w-md overflow-y-auto"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{t("detail_sheet.title")}</SheetTitle>
        </SheetHeader>

        {!earning ? null : (
          <div className="flex flex-col gap-6">
            {/* Earning section */}
            <section aria-label={t("detail_sheet.section_earning")}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("detail_sheet.section_earning")}
              </p>
              <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("columns.date")}</span>
                  <span className="text-sm">{formatShortDate(earning.period_date, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("columns.freelancer")}</span>
                  <span className="text-sm font-medium truncate max-w-[180px] text-right">{earning.freelancer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("columns.gross_base")}</span>
                  <span className="text-sm tabular-nums">{formatCurrency(earning.gross_amount_base, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("columns.commission_pct")}</span>
                  <span className="text-sm tabular-nums">{earning.commission_pct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("columns.commission_amount")}</span>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(earning.commission_amount, locale)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("columns.status")}</span>
                  <EarningStatusBadge status={earning.status} label={statusLabel} />
                </div>
              </div>
            </section>

            {/* Service section */}
            <section aria-label={t("detail_sheet.section_service")}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("detail_sheet.section_service")}
              </p>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-mono text-foreground">{earning.service_id}</p>
              </div>
            </section>

            {/* Payout section */}
            <section aria-label={t("detail_sheet.section_payout")}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("detail_sheet.section_payout")}
              </p>
              {!payout ? (
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t("payout_sheet.no_payout")}</p>
                </div>
              ) : (
                <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t("payout_sheet.date_label")}</span>
                    <span className="text-sm">{formatShortDate(payout.payout_date, locale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t("payout_sheet.amount_label")}</span>
                    <span className="text-sm tabular-nums font-medium">{formatCurrency(payout.net_amount, locale)}</span>
                  </div>
                  {payout.nominal_account_ref && (
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">{t("payout_sheet.ref_label")}</span>
                      <span className="text-xs font-mono">{payout.nominal_account_ref}</span>
                    </div>
                  )}
                  {/* Timeline */}
                  <div className="mt-1 flex items-center gap-2">
                    {payout.status === "PAID" && (
                      <BadgeCheck className="size-4 text-success shrink-0" aria-hidden="true" />
                    )}
                    {payout.status === "PROCESSING" && (
                      <Clock className="size-4 text-info shrink-0" aria-hidden="true" />
                    )}
                    {payout.status === "PENDING" && (
                      <Clock className="size-4 text-warning shrink-0" aria-hidden="true" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        payout.status === "PAID" && "text-success",
                        payout.status === "PROCESSING" && "text-info",
                        payout.status === "PENDING" && "text-warning",
                        payout.status === "FAILED" && "text-destructive"
                      )}
                    >
                      {payout.status === "PAID" && t("detail_sheet.payout_timeline_paid")}
                      {payout.status === "PROCESSING" && t("detail_sheet.payout_timeline_processing")}
                      {payout.status === "PENDING" && t("detail_sheet.payout_timeline_pending")}
                    </span>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
