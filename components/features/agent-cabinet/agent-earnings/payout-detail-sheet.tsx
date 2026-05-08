"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getMyPayoutById } from "@/lib/api/agent-cabinet";
import { formatCurrency } from "@/lib/utils/format";
import type { Locale, Payout } from "@/lib/types";
import { formatShortDate } from "./_shared";

interface PayoutDetailSheetProps {
  payoutId: string;
  freelancerName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: Locale;
}

export function PayoutDetailSheet({
  payoutId,
  freelancerName,
  open,
  onOpenChange,
  locale,
}: PayoutDetailSheetProps) {
  const t = useTranslations("screen.agentEarnings");
  const [payout, setPayout] = useState<Payout | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    if (!open || !payoutId) return;
    setPayoutLoading(true);
    getMyPayoutById(payoutId)
      .then((res) => setPayout(res.data))
      .catch(() => setPayout(null))
      .finally(() => setPayoutLoading(false));
  }, [open, payoutId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-sm sm:max-w-md overflow-y-auto"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{t("payout_sheet.title")}</SheetTitle>
        </SheetHeader>

        {payoutLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !payout ? (
          <p className="text-sm text-muted-foreground">{t("payout_sheet.no_payout")}</p>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Summary */}
            <div className="rounded-lg bg-muted p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("payout_sheet.amount_label")}</span>
                <span className="text-base font-semibold tabular-nums">
                  {formatCurrency(payout.net_amount, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("payout_sheet.date_label")}</span>
                <span className="text-sm">{formatShortDate(payout.payout_date, locale)}</span>
              </div>
              {payout.nominal_account_ref && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("payout_sheet.ref_label")}</span>
                  <span className="text-xs font-mono text-foreground">{payout.nominal_account_ref}</span>
                </div>
              )}
            </div>

            {/* Services in this payout for this freelancer */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("payout_sheet.services_label")}
              </p>
              <ul className="flex flex-col gap-1">
                {payout.services.length === 0 ? (
                  <li className="text-sm text-muted-foreground">—</li>
                ) : (
                  payout.services.map((svcId) => (
                    <li key={svcId} className="text-sm text-foreground font-mono">
                      {svcId}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <Separator />

            {/* Freelancer */}
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Исполнитель</p>
              <p className="text-sm font-medium text-foreground">{freelancerName}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
