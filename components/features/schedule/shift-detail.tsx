"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { AlertTriangle, Calendar, Phone, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PageHeader } from "@/components/shared";

import {
  cancelShift,
  forceCloseShift,
  getShiftById,
  getShiftHistory,
  markShiftLate,
  markShiftOvertime,
} from "@/lib/api/shifts";
import type { ShiftDetail as ShiftDetailData, ShiftHistoryEvent } from "@/lib/api/shifts";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { formatDate } from "./shift-detail/_shared";
import { ForceCloseDialog } from "./shift-detail/force-close-dialog";
import { HeroCard, KpiRow } from "./shift-detail/header";
import { PlanVsFactCard } from "./shift-detail/plan-vs-fact-card";
import { ReasonDialog } from "./shift-detail/reason-dialog";
import { ShiftDetailSkeleton } from "./shift-detail/skeleton";
import { AuditCard, EmployeeCard, StatsCard, StoreCard } from "./shift-detail/sidebar";
import { TabBreaks } from "./shift-detail/tab-breaks";
import { TabHistory } from "./shift-detail/tab-history";
import { TabTasks } from "./shift-detail/tab-tasks";
import { TabZones } from "./shift-detail/tab-zones";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ShiftDetail({ shiftId }: { shiftId: number }) {
  const t = useTranslations("screen.shiftDetail");
  const locale = useLocale();
  const router = useRouter();

  const [shift, setShift] = useState<ShiftDetailData | null>(null);
  const [history, setHistory] = useState<ShiftHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Dialog state
  const [lateDialogOpen, setLateDialogOpen] = useState(false);
  const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [forceCloseOpen, setForceCloseOpen] = useState(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shiftRes, histRes] = await Promise.all([
        getShiftById(String(shiftId)),
        getShiftHistory(shiftId),
      ]);
      setShift(shiftRes.data);
      setHistory(histRes.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg.includes("not found")) {
        setNotFound(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Loading ──────────────────────────────────────────────────────

  if (loading) return <ShiftDetailSkeleton />;

  // ── Not found ───────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">{t("states.not_found_title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("states.not_found_subtitle", { id: shiftId })}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={ADMIN_ROUTES.schedule}>← Расписание</Link>
        </Button>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Ошибка загрузки</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="size-4 mr-2" />
          {t("states.error_retry")}
        </Button>
      </div>
    );
  }

  if (!shift) return null;

  // ── Derived state ────────────────────────────────────────────────

  const hasActiveTasks = shift.tasks?.some((task) => task.state === "IN_PROGRESS") ?? false;

  const shiftDateFormatted = formatDate(shift.shift_date, locale);
  const heroTitle = `${shiftDateFormatted} — ${shift.user_name}`;

  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.schedule"), href: ADMIN_ROUTES.schedule },
    { label: t("breadcrumbs.shift", { id: shiftId }) },
  ];

  // ── Handlers ─────────────────────────────────────────────────────

  async function handleMarkLate(reason: string) {
    const res = await markShiftLate(shiftId, reason);
    if (res.success) {
      toast.success(t("toast.marked_late"));
      load();
    } else {
      toast.error(t("toast.error"));
    }
  }

  async function handleMarkOvertime(reason: string) {
    const res = await markShiftOvertime(shiftId, reason);
    if (res.success) {
      toast.success(t("toast.marked_overtime"));
      load();
    } else {
      toast.error(t("toast.error"));
    }
  }

  async function handleCancelShift(reason: string) {
    const res = await cancelShift(shiftId, reason);
    if (res.success) {
      toast.success(t("toast.cancelled"));
      router.push(ADMIN_ROUTES.schedule);
    } else {
      toast.error(t("toast.error"));
    }
  }

  async function handleForceClose() {
    const res = await forceCloseShift(shiftId);
    if (res.success) {
      toast.success(t("toast.force_closed"));
      load();
    } else {
      toast.error(t("toast.error"));
    }
  }

  // ── RENDER ──────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        {/* ── PAGE HEADER ── */}
        <PageHeader
          breadcrumbs={breadcrumbs}
          title={heroTitle}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild className="min-h-[36px]">
                <Link href={ADMIN_ROUTES.schedule}>
                  <Calendar className="size-4 mr-1.5" />
                  <span className="hidden sm:inline">К расписанию</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="min-h-[36px]">
                <Phone className="size-4 mr-1.5" />
                <span className="hidden sm:inline">Связаться</span>
              </Button>
            </div>
          }
        />

        {/* ── HERO CARD ── */}
        <HeroCard
          shift={shift}
          onMarkLate={() => setLateDialogOpen(true)}
          onMarkOvertime={() => setOvertimeDialogOpen(true)}
          onForceClose={() => setForceCloseOpen(true)}
          onCancel={() => setCancelDialogOpen(true)}
        />

        {/* ── KPI ROW ── */}
        <KpiRow shift={shift} />

        {/* ── MAIN 2-COLUMN GRID ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── MAIN col-span-2 ── */}
          <div className="lg:col-span-2 space-y-6">
            <PlanVsFactCard shift={shift} />

            {/* Tabs */}
            <Card>
              <CardContent className="p-4 md:p-6">
                <Tabs defaultValue="tasks">
                  <TabsList className="w-full justify-start overflow-x-auto mb-4">
                    <TabsTrigger value="tasks">{t("tabs.tasks")}</TabsTrigger>
                    <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
                    <TabsTrigger value="zones">{t("tabs.zones")}</TabsTrigger>
                    <TabsTrigger value="breaks">{t("tabs.breaks")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tasks">
                    <TabTasks shift={shift} />
                  </TabsContent>
                  <TabsContent value="history">
                    <TabHistory events={history} />
                  </TabsContent>
                  <TabsContent value="zones">
                    <TabZones shift={shift} />
                  </TabsContent>
                  <TabsContent value="breaks">
                    <TabBreaks shift={shift} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* ── SIDEBAR col-1 ── */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <EmployeeCard shift={shift} />
            <StoreCard shift={shift} />
            <StatsCard shift={shift} />
            <AuditCard shift={shift} />
          </div>
        </div>
      </div>

      {/* ── DIALOGS ── */}
      <ReasonDialog
        open={lateDialogOpen}
        onOpenChange={setLateDialogOpen}
        title={t("dialogs.mark_late_title")}
        label={t("dialogs.mark_late_label")}
        placeholder={t("dialogs.mark_late_placeholder")}
        confirmLabel={t("dialogs.mark_late_confirm")}
        onConfirm={handleMarkLate}
        isMobile={isMobile}
      />

      <ReasonDialog
        open={overtimeDialogOpen}
        onOpenChange={setOvertimeDialogOpen}
        title={t("dialogs.mark_overtime_title")}
        label={t("dialogs.mark_overtime_label")}
        placeholder={t("dialogs.mark_overtime_placeholder")}
        confirmLabel={t("dialogs.mark_overtime_confirm")}
        onConfirm={handleMarkOvertime}
        isMobile={isMobile}
      />

      <ReasonDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={t("dialogs.cancel_shift_title")}
        label={t("dialogs.cancel_shift_label")}
        placeholder=""
        confirmLabel={t("dialogs.cancel_shift_confirm")}
        warning={t("dialogs.cancel_shift_warning")}
        onConfirm={handleCancelShift}
        isMobile={isMobile}
      />

      <ForceCloseDialog
        open={forceCloseOpen}
        onOpenChange={setForceCloseOpen}
        hasActiveTasks={hasActiveTasks}
        onConfirm={handleForceClose}
      />
    </>
  );
}
