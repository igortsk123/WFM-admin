"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { Service, NoShowReport, PaymentMode } from "@/lib/types";
import { ServiceStatusBadge } from "@/components/shared/service-status-badge";
import { WorkTypeBadge } from "@/components/shared/work-type-badge";

interface ServiceDetailSheetProps {
  service: Service | null;
  noShowReport?: NoShowReport | null;
  paymentMode: PaymentMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Can the current user adjust amount (REGIONAL+, NOMINAL_ACCOUNT only) */
  canAdjustAmount: boolean;
  onAdjustAmount?: (service: Service) => void;
  /** Can confirm/dispute (STORE_DIRECTOR of this store or above) */
  canConfirm: boolean;
  onConfirm?: (service: Service) => void;
  onDispute?: (service: Service) => void;
  onSendToLegal?: (report: NoShowReport) => void;
  canSendToLegal: boolean;
}

function formatAmount(amount: number, currency = "RUB", locale = "ru"): string {
  const symbol = currency === "RUB" ? "₽" : currency === "GBP" ? "£" : "$";
  const formatted = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${symbol}`;
}

function formatDate(dateStr: string, locale: string): string {
  try {
    return format(new Date(dateStr), "d MMM yyyy", {
      locale: locale === "ru" ? ru : undefined,
    });
  } catch {
    return dateStr;
  }
}

export function ServiceDetailSheet({
  service,
  noShowReport,
  paymentMode,
  open,
  onOpenChange,
  canAdjustAmount,
  onAdjustAmount,
  canConfirm,
  onConfirm,
  onDispute,
  onSendToLegal,
  canSendToLegal,
}: ServiceDetailSheetProps) {
  const t = useTranslations("screen.freelanceServicesList");
  const locale = useLocale();

  if (!service) return null;

  const isNominal = paymentMode === "NOMINAL_ACCOUNT";
  const amount = isNominal ? service.total_amount : service.total_amount_indicative;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            {t("sheet.title")}
          </SheetTitle>
        </SheetHeader>

        {/* Status + Work type */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ServiceStatusBadge status={service.status} />
          <WorkTypeBadge
            workType={{ id: service.work_type_id, name: service.work_type_name }}
            size="sm"
          />
          {service.manually_adjusted && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Pencil className="size-3" />
              {t("adjusted_tooltip")}
            </Badge>
          )}
        </div>

        {/* Date + Object */}
        <div className="space-y-1 mb-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {formatDate(service.service_date, locale)}
          </p>
          <p className="text-sm font-medium text-foreground">{service.store_name}</p>
        </div>

        <Separator className="mb-4" />

        {/* Performer */}
        <section aria-labelledby="sheet-performer" className="mb-4">
          <h3 id="sheet-performer" className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
            {t("sheet.freelancer_section")}
          </h3>
          <p className="text-sm font-medium text-foreground">{service.freelancer_name}</p>
          <p className="text-xs text-muted-foreground">{service.freelancer_phone}</p>
          {service.agent_name && isNominal && (
            <p className="text-xs text-muted-foreground mt-0.5">{service.agent_name}</p>
          )}
        </section>

        <Separator className="mb-4" />

        {/* Hours */}
        <section aria-labelledby="sheet-hours" className="mb-4">
          <h3 id="sheet-hours" className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
            {t("sheet.hours_section")}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-lg font-semibold text-foreground">{service.scheduled_hours}</p>
              <p className="text-xs text-muted-foreground">{t("sheet.scheduled")}</p>
            </div>
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-lg font-semibold text-foreground">{service.actual_hours}</p>
              <p className="text-xs text-muted-foreground">{t("sheet.actual")}</p>
            </div>
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-lg font-semibold text-foreground">{service.payable_hours}</p>
              <p className="text-xs text-muted-foreground">{t("sheet.payable")}</p>
            </div>
          </div>
          {service.underload_not_fault && service.adjustment_reason && (
            <p className="mt-2 text-xs text-info bg-info/10 rounded-md px-2 py-1.5">
              {service.adjustment_reason}
            </p>
          )}
          {/* Volume */}
          <p className="mt-2 text-sm text-muted-foreground">
            {service.normative_volume} {service.normative_unit}
          </p>
        </section>

        {/* Amount */}
        {amount != null && (
          <>
            <Separator className="mb-4" />
            <section className="mb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {t("columns.amount")} {!isNominal && <span className="text-xs normal-case">{t("columns.amount_indicative")}</span>}
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {formatAmount(amount, "RUB", locale)}
              </p>
            </section>
          </>
        )}

        {/* Manually adjusted history */}
        {service.manually_adjusted && (
          <>
            <Separator className="mb-4" />
            <section aria-labelledby="sheet-adjustment" className="mb-4">
              <h3 id="sheet-adjustment" className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                {t("sheet.adjustment_history")}
              </h3>
              <div className="space-y-1.5 bg-muted rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("sheet.adjusted_by")}</span>
                  <span className="font-medium text-foreground">{service.manually_adjusted.adjusted_by_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("sheet.from_amount")}</span>
                  <span className="text-foreground">{formatAmount(service.manually_adjusted.from_amount, "RUB", locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("sheet.to_amount")}</span>
                  <span className="font-medium text-foreground">{formatAmount(service.manually_adjusted.to_amount, "RUB", locale)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">{t("sheet.reason")}</span>
                  <span className="text-foreground text-right">{service.manually_adjusted.reason}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Related payout */}
        {service.payout_id && isNominal && (
          <>
            <Separator className="mb-4" />
            <section className="mb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {t("sheet.related_payout")}
              </p>
              <div className="flex items-center gap-2">
                <ExternalLink className="size-3.5 text-muted-foreground" />
                <span className="text-sm text-primary font-mono">{service.payout_id}</span>
              </div>
            </section>
          </>
        )}

        {/* NoShow Report */}
        {noShowReport && (
          <>
            <Separator className="mb-4" />
            <section aria-labelledby="sheet-noshow" className="mb-4">
              <h3 id="sheet-noshow" className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                {t("sheet.no_show_report")}
              </h3>
              <div className="space-y-1.5 bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("columns.legal_status")}</span>
                  <NoShowLegalBadge status={noShowReport.status} />
                </div>
                {noShowReport.legal_comment && (
                  <p className="text-muted-foreground pt-1">{noShowReport.legal_comment}</p>
                )}
              </div>
              {canSendToLegal && noShowReport.status === "OPEN" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => onSendToLegal?.(noShowReport)}
                >
                  {t("actions.to_legal")}
                </Button>
              )}
            </section>
          </>
        )}

        {/* Geo check-in */}
        {service.assignment_id && (
          <>
            <Separator className="mb-4" />
            <section className="mb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                {t("sheet.geo_checkin")}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("sheet.assignment")}: {service.assignment_id}</span>
              </div>
            </section>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {canConfirm && service.status === "COMPLETED" && (
            <>
              <Button
                className="w-full min-h-[44px]"
                onClick={() => onConfirm?.(service)}
              >
                <CheckCircle className="size-4 mr-2" />
                {t("actions.confirm")}
              </Button>
              <Button
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={() => onDispute?.(service)}
              >
                <XCircle className="size-4 mr-2" />
                {t("actions.dispute")}
              </Button>
            </>
          )}
          {isNominal && service.status === "PAID" && (
            <Button variant="outline" className="w-full min-h-[44px]">
              {t("actions.download_act")}
            </Button>
          )}
          {canAdjustAmount && isNominal && (
            <Button
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={() => onAdjustAmount?.(service)}
            >
              <Pencil className="size-4 mr-2" />
              {t("actions.adjust_amount")}
            </Button>
          )}
          {service.status === "NO_SHOW" && noShowReport && canSendToLegal && noShowReport.status === "OPEN" && null /* already shown above */}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const NO_SHOW_LEGAL_STATUS_CLASS: Record<NoShowReport["status"], string> = {
  OPEN: "bg-warning/10 text-warning",
  IN_LEGAL: "bg-info/10 text-info",
  RESOLVED: "bg-success/10 text-success",
  WRITTEN_OFF: "bg-muted text-muted-foreground",
};

const NO_SHOW_LEGAL_STATUS_LABEL_RU: Record<NoShowReport["status"], string> = {
  OPEN: "Открыт",
  IN_LEGAL: "У юристов",
  RESOLVED: "Решён",
  WRITTEN_OFF: "Списан",
};

function NoShowLegalBadge({
  status,
}: {
  status: NoShowReport["status"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t?: any;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${NO_SHOW_LEGAL_STATUS_CLASS[status]}`}
    >
      {NO_SHOW_LEGAL_STATUS_LABEL_RU[status]}
    </span>
  );
}

export { NoShowLegalBadge };
