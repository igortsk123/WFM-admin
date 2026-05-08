"use client"

import { useTranslations, useLocale } from "next-intl"
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Send,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import type { TaskDetail as TaskDetailType } from "@/lib/api/tasks"

import { ApproveDialogContent } from "../approve-dialog-content"
import { RejectDialogContent } from "../reject-dialog-content"
import { fmtMin, getDeviationClass } from "./_shared"

interface TabReportProps {
  task: TaskDetailType
  actualMin: number | null
  canReview: boolean
  lightboxOpen: boolean
  setLightboxOpen: (v: boolean) => void
  approveOpen: boolean
  setApproveOpen: (v: boolean) => void
  rejectOpen: boolean
  setRejectOpen: (v: boolean) => void
  approvePending: boolean
  rejectPending: boolean
  onApprove: (comment?: string) => Promise<void>
  onReject: (reason: string) => Promise<void>
  firstIncompleteSubtaskName?: string
}

export function TabReport({
  task,
  actualMin,
  canReview,
  lightboxOpen,
  setLightboxOpen,
  approveOpen,
  setApproveOpen,
  rejectOpen,
  setRejectOpen,
  approvePending,
  rejectPending,
  onApprove,
  onReject,
  firstIncompleteSubtaskName,
}: TabReportProps) {
  const t = useTranslations("screen.taskDetail")
  const locale = useLocale()

  return (
    <div className="flex flex-col gap-4">
      {task.state !== "COMPLETED" ? (
        <EmptyState
          icon={FileText}
          title={t("report_empty_title")}
          description={t("report_empty_desc")}
        />
      ) : (
        <>
          {/* Photo — секция показывается только если фото требуется или уже загружено */}
          {(task.requires_photo || task.report_image_url) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("section_report_photo")}</CardTitle>
              </CardHeader>
              <CardContent>
                {task.requires_photo && !task.report_image_url ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="size-4" />
                    <AlertDescription>{t("photo_required_missing")}</AlertDescription>
                  </Alert>
                ) : task.report_image_url ? (
                  <>
                    {/* Desktop: Dialog lightbox */}
                    <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                      <DialogTrigger asChild>
                        <button className="w-full rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary hidden md:block" aria-label={t("section_report_photo")}>
                          <img
                            src={task.report_image_url}
                            alt={t("section_report_photo")}
                            className="w-full aspect-video object-cover rounded-md hover:opacity-95 transition-opacity cursor-zoom-in"
                            crossOrigin="anonymous"
                          />
                        </button>
                      </DialogTrigger>
                      {lightboxOpen && (
                        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
                          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                            <img src={task.report_image_url} alt={t("section_report_photo")} className="w-full rounded-md" crossOrigin="anonymous" />
                            <div className="absolute top-3 right-3 flex gap-2">
                              <Button size="sm" variant="secondary" asChild>
                                <a href={task.report_image_url} download target="_blank" rel="noopener noreferrer">
                                  <Download className="size-4 mr-1" />{t("photo_download")}
                                </a>
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setLightboxOpen(false)}>{t("lightbox_close")}</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Dialog>

                    {/* Mobile: Sheet bottom */}
                    <Sheet>
                      <button className="w-full rounded-md overflow-hidden md:hidden" aria-label={t("section_report_photo")}>
                        <img
                          src={task.report_image_url}
                          alt={t("section_report_photo")}
                          className="w-full aspect-video object-cover rounded-md cursor-pointer"
                          crossOrigin="anonymous"
                          onClick={() => setLightboxOpen(true)}
                        />
                      </button>
                      <SheetContent side="bottom" className="h-[85vh] md:hidden">
                        <SheetHeader>
                          <SheetTitle>{t("section_report_photo")}</SheetTitle>
                        </SheetHeader>
                        <div className="flex flex-col gap-4 mt-4">
                          <img src={task.report_image_url} alt={t("section_report_photo")} className="w-full rounded-md" crossOrigin="anonymous" />
                          <Button asChild variant="outline">
                            <a href={task.report_image_url} download target="_blank" rel="noopener noreferrer">
                              <Download className="size-4 mr-2" />{t("photo_download")}
                            </a>
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Timing stats */}
          {actualMin !== null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("section_timing")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("timing_planned")}</p>
                    <p className="text-base font-semibold text-foreground">{fmtMin(task.planned_minutes, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("timing_actual")}</p>
                    <p className={cn("text-base font-semibold", getDeviationClass(task.planned_minutes, actualMin))}>
                      {fmtMin(actualMin, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("timing_deviation")}</p>
                    <p className={cn("text-base font-semibold", getDeviationClass(task.planned_minutes, actualMin))}>
                      {actualMin <= task.planned_minutes
                        ? `-${fmtMin(task.planned_minutes - actualMin, locale)}`
                        : `+${fmtMin(actualMin - task.planned_minutes, locale)}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Marketing channel */}
          {task.marketing_channel_target && task.review_state === "ACCEPTED" && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Send className="size-4 text-info" />
                  <span>{t("marketing_sent", { channel: task.marketing_channel_target })}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inline Approve/Reject on desktop for ON_REVIEW */}
          {task.review_state === "ON_REVIEW" && canReview && (
            <div className="hidden md:flex gap-2">
              <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex-1">
                    <XCircle className="size-4 mr-1.5" />{t("btn_reject")}
                  </Button>
                </DialogTrigger>
                <RejectDialogContent onReject={onReject} onClose={() => setRejectOpen(false)} isPending={rejectPending} incompleteSubtaskName={firstIncompleteSubtaskName} />
              </Dialog>
              <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-success text-success-foreground hover:bg-success/90 flex-1" size="sm">
                    <CheckCircle2 className="size-4 mr-1.5" />{t("btn_approve")}
                  </Button>
                </DialogTrigger>
                <ApproveDialogContent onApprove={onApprove} onClose={() => setApproveOpen(false)} isPending={approvePending} />
              </Dialog>
            </div>
          )}
        </>
      )}
    </div>
  )
}
