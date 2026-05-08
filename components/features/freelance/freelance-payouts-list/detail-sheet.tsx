"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Link2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PayoutStatusBadge } from "@/components/shared/payout-status-badge";
import { UserCell } from "@/components/shared/user-cell";
import {
  getClosingDocumentUrl,
  getPayoutById,
} from "@/lib/api/freelance-payouts";
import type { Service } from "@/lib/types";

import {
  formatCurrency,
  formatDate,
  formatShortDate,
  freelancerToUser,
  type DetailedPayout,
} from "./_shared";

interface PayoutDetailSheetProps {
  payoutId: string | null;
  onClose: () => void;
  onRetry: (id: string) => void;
}

export function PayoutDetailSheet({
  payoutId,
  onClose,
  onRetry,
}: PayoutDetailSheetProps) {
  const t = useTranslations("screen.freelancePayoutsList");
  const [detail, setDetail] = useState<DetailedPayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await getPayoutById(id);
      setDetail(res.data as unknown as DetailedPayout);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (payoutId) {
      setDetail(null);
      loadDetail(payoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutId]);

  const handleDownloadAct = async () => {
    if (!detail) return;
    setDocLoading(true);
    try {
      const res = await getClosingDocumentUrl(detail.id);
      window.open(res.data.url, "_blank");
    } catch {
      toast.error(t("toasts.doc_error"));
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <Sheet open={!!payoutId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full sm:max-w-lg overflow-y-auto"
        side="right"
      >
        <SheetHeader className="pb-4">
          <SheetTitle>{t("sheet.title")}</SheetTitle>
        </SheetHeader>

        {loading || !detail ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header: date + freelancer */}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <UserCell
                  user={freelancerToUser(detail.freelancer_name)}
                  className="mb-1"
                />
                <p className="text-sm text-muted-foreground pl-[42px]">
                  {formatDate(detail.payout_date)}
                </p>
              </div>
              <PayoutStatusBadge status={detail.status} />
            </div>

            <Separator />

            {/* Amount card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("sheet.amount_card")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("sheet.gross")}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(detail.gross_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("sheet.fee")}
                  </span>
                  <span className="text-destructive">
                    −{formatCurrency(detail.nominal_account_fee)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>{t("sheet.net")}</span>
                  <span>{formatCurrency(detail.net_amount)}</span>
                </div>
                {detail.agent_commission && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("sheet.agent_commission")}</span>
                    <span>{formatCurrency(detail.agent_commission)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services table */}
            {(detail.services_data as Service[] | undefined)?.length ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("sheet.services_table")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">
                          {t("sheet.service_date")}
                        </TableHead>
                        <TableHead className="text-xs">
                          {t("sheet.service_store")}
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          {t("sheet.service_hours")}
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          {t("sheet.service_amount")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail.services_data as Service[]).map((svc) => (
                        <TableRow key={svc.id}>
                          <TableCell className="text-xs py-2">
                            {formatShortDate(svc.service_date)}
                          </TableCell>
                          <TableCell className="text-xs py-2 max-w-[100px] truncate">
                            {svc.store_name}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            {svc.payable_hours}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right font-medium">
                            {svc.total_amount
                              ? formatCurrency(svc.total_amount)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            {/* Documents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("sheet.documents_card")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detail.closing_doc_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={handleDownloadAct}
                    disabled={docLoading}
                  >
                    <FileText className="size-4 text-muted-foreground" />
                    {t("sheet.closing_doc")}
                    <ExternalLink className="size-3 ml-auto text-muted-foreground" />
                  </Button>
                ) : null}
                {detail.nominal_account_ref ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Link2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {t("sheet.nominal_ref")}:&nbsp;
                    </span>
                    <span className="font-mono text-xs truncate">
                      {detail.nominal_account_ref}
                    </span>
                  </div>
                ) : null}
                {!detail.closing_doc_url && !detail.nominal_account_ref && (
                  <p className="text-sm text-muted-foreground">
                    {t("sheet.no_history")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("sheet.history_card")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detail.failure_reason ? (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="size-4 mt-0.5 shrink-0" />
                    <span>{detail.failure_reason}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("sheet.no_history")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {detail.status === "FAILED" && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 min-h-11"
                  onClick={() => onRetry(detail.id)}
                >
                  <RefreshCw className="size-4 mr-1.5" />
                  {t("sheet.retry_action")}
                </Button>
              )}
              {detail.status === "PAID" && detail.closing_doc_url && (
                <Button
                  size="sm"
                  className="flex-1 min-h-11"
                  onClick={handleDownloadAct}
                  disabled={docLoading}
                >
                  <Download className="size-4 mr-1.5" />
                  {t("sheet.download_act")}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
