"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle, Download, FileText } from "lucide-react"

import type { Payout } from "@/lib/types"
import { getPayouts } from "@/lib/api/freelance-payouts"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared"

import type { FormatDate } from "./_shared"

interface EmployeePayoutsTabProps {
  freelancerId: number
  locale: string
  formatDate: FormatDate
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
}

const PAYOUT_STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  PROCESSING: "bg-info/10 text-info",
  PAID: "bg-success/10 text-success",
  FAILED: "bg-destructive/10 text-destructive",
}

export function EmployeePayoutsTab({ freelancerId, locale, formatDate, t, tCommon }: EmployeePayoutsTabProps) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading")

  useEffect(() => {
    setLoadState("loading")
    getPayouts({ freelancer_id: freelancerId, page_size: 50 })
      .then((res) => {
        setPayouts(res.data)
        setLoadState("loaded")
      })
      .catch(() => setLoadState("error"))
  }, [freelancerId])

  const tFreelance = useTranslations("freelance")

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "ru-RU", {
      style: "currency",
      currency: locale === "en" ? "GBP" : "RUB",
      maximumFractionDigits: 0,
    }).format(amount)

  if (loadState === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    )
  }

  if (loadState === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{tCommon("error")}</AlertDescription>
      </Alert>
    )
  }

  if (payouts.length === 0) {
    return <EmptyState icon={FileText} title={t("payouts_tab.empty")} description="" />
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("payouts_tab.col_date")}</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("payouts_tab.col_gross")}</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">{t("payouts_tab.col_commission")}</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("payouts_tab.col_net")}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("payouts_tab.col_status")}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t("payouts_tab.col_action")}</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-foreground whitespace-nowrap">
                {formatDate(payout.payout_date, locale)}
              </td>
              <td className="px-4 py-3 text-right text-foreground">{formatCurrency(payout.gross_amount)}</td>
              <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                {payout.nominal_account_fee != null ? formatCurrency(payout.nominal_account_fee) : "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(payout.net_amount)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${PAYOUT_STATUS_CLASS[payout.status] ?? "bg-muted text-muted-foreground"}`}>
                  {tFreelance(`payout.status.${payout.status}`)}
                </span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                {payout.closing_doc_url && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                    <Download className="size-3.5" aria-hidden="true" />
                    {t("payouts_tab.download_act")}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
