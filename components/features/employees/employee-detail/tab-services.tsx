"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle, Briefcase } from "lucide-react"

import type { Service } from "@/lib/types"
import { getServices } from "@/lib/api/freelance-services"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EmptyState } from "@/components/shared"

import { SERVICE_STATUS_CLASS, type FormatDate } from "./_shared"

interface EmployeeServicesTabProps {
  freelancerId: number
  paymentMode: "NOMINAL_ACCOUNT" | "CLIENT_DIRECT"
  locale: string
  formatDate: FormatDate
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
}

export function EmployeeServicesTab({ freelancerId, paymentMode, locale, formatDate, t, tCommon }: EmployeeServicesTabProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading")
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  useEffect(() => {
    setLoadState("loading")
    getServices({ freelancer_id: freelancerId, page_size: 50 })
      .then((res) => {
        setServices(res.data)
        setLoadState("loaded")
      })
      .catch(() => setLoadState("error"))
  }, [freelancerId])

  const tFreelance = useTranslations("freelance")

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

  if (services.length === 0) {
    return <EmptyState icon={Briefcase} title={t("services_tab.empty")} description="" />
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("services_tab.col_date")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("services_tab.col_store")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t("services_tab.col_work_type")}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("services_tab.col_hours")}</th>
              {paymentMode === "NOMINAL_ACCOUNT" && (
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">{t("services_tab.col_amount")}</th>
              )}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("services_tab.col_status")}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => (
              <tr
                key={svc.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedService(svc)}
              >
                <td className="px-4 py-3 text-foreground whitespace-nowrap">
                  {formatDate(svc.service_date, locale)}
                </td>
                <td className="px-4 py-3 text-foreground truncate max-w-[140px]">{svc.store_name}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[160px]">
                  {svc.work_type_name}
                </td>
                <td className="px-4 py-3 text-right text-foreground">{svc.actual_hours ?? svc.scheduled_hours}</td>
                {paymentMode === "NOMINAL_ACCOUNT" && (
                  <td className="px-4 py-3 text-right text-foreground hidden md:table-cell">
                    {svc.total_amount != null
                      ? new Intl.NumberFormat(locale === "en" ? "en-GB" : "ru-RU", {
                          style: "currency",
                          currency: locale === "en" ? "GBP" : "RUB",
                          maximumFractionDigits: 0,
                        }).format(svc.total_amount)
                      : "—"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${SERVICE_STATUS_CLASS[svc.status] ?? "bg-muted text-muted-foreground"}`}>
                    {tFreelance(`service.status.${svc.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Service detail sheet */}
      <Sheet open={!!selectedService} onOpenChange={(v) => { if (!v) setSelectedService(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{t("services_tab.sheet_title")}</SheetTitle>
          </SheetHeader>
          {selectedService && (
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_date")}</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatDate(selectedService.service_date, locale)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_store")}</dt>
                <dd className="text-sm text-foreground mt-0.5">{selectedService.store_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_work_type")}</dt>
                <dd className="text-sm text-foreground mt-0.5">{selectedService.work_type_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_hours")}</dt>
                <dd className="text-sm text-foreground mt-0.5">{selectedService.actual_hours ?? selectedService.scheduled_hours} ч.</dd>
              </div>
              {selectedService.total_amount != null && (
                <div>
                  <dt className="text-xs text-muted-foreground">{t("services_tab.col_amount")}</dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {new Intl.NumberFormat(locale === "en" ? "en-GB" : "ru-RU", {
                      style: "currency",
                      currency: locale === "en" ? "GBP" : "RUB",
                      maximumFractionDigits: 0,
                    }).format(selectedService.total_amount)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_status")}</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${SERVICE_STATUS_CLASS[selectedService.status] ?? "bg-muted text-muted-foreground"}`}>
                    {tFreelance(`service.status.${selectedService.status}`)}
                  </span>
                </dd>
              </div>
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
