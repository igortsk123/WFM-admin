"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { FilterChip, PageHeader } from "@/components/shared";

import {
  forceCloseShift,
  getSchedule,
  reopenShift,
  syncLamaShifts,
  type ScheduleResponse,
  type ScheduleSlot,
  type ScheduleView,
} from "@/lib/api/shifts";
import { getZones } from "@/lib/api";
import { useStoreContext } from "@/lib/hooks/use-store-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import {
  ConfirmActionDialog,
  type ConfirmActionState,
} from "./schedule-calendar/confirm-action-dialog";
import { FutureFeatureBanner } from "./schedule-calendar/future-feature-banner";
import { LegendRow } from "./schedule-calendar/legend";
import { ScheduleSkeleton } from "./schedule-calendar/skeleton";
import { StatsBar } from "./schedule-calendar/stats-bar";
import { Toolbar } from "./schedule-calendar/toolbar";
import { DayView } from "./schedule-calendar/view-day";
import { MobileDayView } from "./schedule-calendar/view-mobile-day";
import { MobileWeekView } from "./schedule-calendar/view-mobile-week";
import { MonthView } from "./schedule-calendar/view-month";
import { WeekView } from "./schedule-calendar/view-week";
import { TODAY, type ComboboxOption } from "./schedule-calendar/_shared";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ScheduleCalendar() {
  const t = useTranslations("screen.schedule");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();
  const dateFnsLocale = locale === "ru" ? ru : enUS;

  // Store-context (URL ?store=N, persists across screens)
  const {
    storeIdParam: filterStore,
    setStoreId: setFilterStoreRaw,
    storeOptions: ctxStoreOptions,
  } = useStoreContext();
  const setFilterStore = React.useCallback(
    (v: string) => {
      void setFilterStoreRaw(v);
    },
    [setFilterStoreRaw],
  );

  // State
  const [view, setView] = React.useState<ScheduleView>("week");
  const [currentDate, setCurrentDate] = React.useState<Date>(TODAY);
  const [selectedDay, setSelectedDay] = React.useState<Date>(TODAY); // mobile week sub-selection
  const [filterZones, setFilterZones] = React.useState<string[]>([]);
  const [, setFilterStatus] = React.useState<string[]>([]);

  const [scheduleData, setScheduleData] =
    React.useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  const [confirmAction, setConfirmAction] =
    React.useState<ConfirmActionState | null>(null);
  const [, setActionLoading] = React.useState(false);

  // Store options берём из useStoreContext (filtered по auth.user.stores).
  // Zone options всё ещё локальные через getZones API.
  const storeOptions = ctxStoreOptions;
  const [zoneOptions, setZoneOptions] = React.useState<ComboboxOption[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    getZones({ page_size: 100 }).then((zones) => {
      if (cancelled) return;
      setZoneOptions(
        zones.data.map((z) => ({ value: String(z.id), label: z.name })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Date range ────────────────────────────────────────────────
  const dateRange = React.useMemo(() => {
    if (view === "day") {
      return {
        from: format(currentDate, "yyyy-MM-dd"),
        to: format(currentDate, "yyyy-MM-dd"),
      };
    }
    if (view === "week") {
      const wStart = startOfWeek(currentDate, {
        locale: dateFnsLocale,
        weekStartsOn: 1,
      });
      const wEnd = endOfWeek(currentDate, {
        locale: dateFnsLocale,
        weekStartsOn: 1,
      });
      return {
        from: format(wStart, "yyyy-MM-dd"),
        to: format(wEnd, "yyyy-MM-dd"),
      };
    }
    // month
    const mStart = startOfMonth(currentDate);
    const mEnd = endOfMonth(currentDate);
    return {
      from: format(mStart, "yyyy-MM-dd"),
      to: format(mEnd, "yyyy-MM-dd"),
    };
  }, [view, currentDate, dateFnsLocale]);

  // ─── Week days (for week view header) ──────────────────────────
  const weekDays = React.useMemo(() => {
    if (view !== "week") return [];
    const wStart = startOfWeek(currentDate, {
      locale: dateFnsLocale,
      weekStartsOn: 1,
    });
    return Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
  }, [view, currentDate, dateFnsLocale]);

  // ─── Period label ───────────────────────────────────────────────
  const periodLabel = React.useMemo(() => {
    if (view === "day") {
      return format(currentDate, "d MMM yyyy", { locale: dateFnsLocale });
    }
    if (view === "week") {
      const wStart = startOfWeek(currentDate, {
        locale: dateFnsLocale,
        weekStartsOn: 1,
      });
      const wEnd = endOfWeek(currentDate, {
        locale: dateFnsLocale,
        weekStartsOn: 1,
      });
      return t("period.range_week", {
        from: format(wStart, "d MMM", { locale: dateFnsLocale }),
        to: format(wEnd, "d MMM yyyy", { locale: dateFnsLocale }),
      });
    }
    // month
    const monthName = format(currentDate, "LLLL", { locale: dateFnsLocale });
    return t("period.range_month", {
      month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      year: format(currentDate, "yyyy"),
    });
  }, [view, currentDate, dateFnsLocale, t]);

  // ─── Fetch data ─────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const storeIds =
      filterStore !== "all" ? [parseInt(filterStore, 10)] : undefined;
    const zoneIds = filterZones.length > 0 ? filterZones.map(Number) : undefined;

    getSchedule({
      view,
      date_from: dateRange.from,
      date_to: dateRange.to,
      store_ids: storeIds,
      zone_ids: zoneIds,
    })
      .then((res) => {
        if (!cancelled) {
          setScheduleData(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load schedule");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, filterStore, filterZones, view]);

  // ─── Navigation ─────────────────────────────────────────────────
  const handlePrev = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, -1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, -1));
    else setCurrentDate((d) => addMonths(d, -1));
  };

  const handleNext = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(TODAY);
    setSelectedDay(TODAY);
  };

  // ─── Sync LAMA ───────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncLamaShifts();
      toast.success(t("toasts.synced"));
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSyncing(false);
    }
  };

  // ─── Shift actions ───────────────────────────────────────────────
  const handleShiftClick = (slot: ScheduleSlot) => {
    router.push(ADMIN_ROUTES.shiftDetail(String(slot.id)));
  };

  const handleShiftAction = (
    action: "reopen" | "force_close",
    slot: ScheduleSlot,
  ) => {
    setConfirmAction({ type: action, slot });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === "reopen") {
        await reopenShift(confirmAction.slot.id);
        toast.success(t("toasts.reopened"));
      } else {
        await forceCloseShift(confirmAction.slot.id);
        toast.success(t("toasts.force_closed"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // ─── Month day click → switch to week ───────────────────────────
  const handleMonthDayClick = (day: Date) => {
    setCurrentDate(day);
    setView("week");
  };

  // ─── Active filter chips ─────────────────────────────────────────
  const activeFilters: Array<{
    key: string;
    label: string;
    value: string;
    onRemove: () => void;
  }> = [];

  if (filterStore !== "all") {
    const storeLabel =
      storeOptions.find((o) => o.value === filterStore)?.label ?? filterStore;
    activeFilters.push({
      key: "store",
      label: t("filters.store"),
      value: storeLabel,
      onRemove: () => setFilterStore("all"),
    });
  }
  filterZones.forEach((z) => {
    const zoneLabel = zoneOptions.find((o) => o.value === z)?.label ?? z;
    activeFilters.push({
      key: `zone_${z}`,
      label: t("filters.zone"),
      value: zoneLabel,
      onRemove: () => setFilterZones((prev) => prev.filter((v) => v !== z)),
    });
  });

  const clearAllFilters = () => {
    setFilterStore("all");
    setFilterZones([]);
    setFilterStatus([]);
  };

  // ─── Stats ───────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    if (!scheduleData) return null;
    const openShifts = scheduleData.slots.filter(
      (s) => s.status === "OPENED",
    ).length;
    const conflicts = scheduleData.slots.filter((s) => s.has_conflict).length;
    const coveragePct = scheduleData.coverage_pct;
    return {
      coverage: coveragePct,
      openShifts,
      planned: scheduleData.total_planned_hours,
      conflicts,
    };
  }, [scheduleData]);

  // ─── Lama sync alert (mock: always show if data is loaded) ───────
  const lamaOutOfSync = false; // In real app: check last sync time

  // ─── RENDER ──────────────────────────────────────────────────────

  if (loading) return <ScheduleSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true);
            setError(null);
          }}
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  const slots = scheduleData?.slots ?? [];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.schedule") },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-4 ${syncing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{t("actions.sync_lama")}</span>
          </Button>
        }
      />

      {/* LAMA out-of-sync alert */}
      {lamaOutOfSync && (
        <Alert>
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{t("grid.lama_out_of_sync", { hours: "3" })}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
            >
              {t("actions.sync_lama")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Future feature banner */}
      <FutureFeatureBanner />

      {/* Toolbar */}
      <Toolbar
        view={view}
        onViewChange={setView}
        periodLabel={periodLabel}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        filterStore={filterStore}
        onFilterStoreChange={setFilterStore}
        storeOptions={storeOptions}
        filterZones={filterZones}
        onFilterZonesChange={setFilterZones}
        zoneOptions={zoneOptions}
        activeFilterCount={activeFilters.length}
        onClearAllFilters={clearAllFilters}
      />

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              value={f.value}
              onRemove={f.onRemove}
            />
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            {t("filters.clear_all")}
          </button>
        </div>
      )}

      {/* Stat bar */}
      {stats && <StatsBar stats={stats} />}

      {/* Calendar grid */}
      <div className="flex flex-col gap-3">
        {/* Legend — desktop */}
        <div className="hidden md:block">
          <LegendRow />
        </div>

        {/* Desktop views */}
        <div className="hidden md:block">
          {view === "week" && (
            <WeekView
              days={weekDays}
              slots={slots}
              onShiftClick={handleShiftClick}
              onShiftAction={handleShiftAction}
            />
          )}
          {view === "day" && (
            <DayView
              day={currentDate}
              slots={slots}
              onShiftClick={handleShiftClick}
              onShiftAction={handleShiftAction}
            />
          )}
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              slots={slots}
              onDayClick={handleMonthDayClick}
            />
          )}
        </div>

        {/* Mobile views */}
        <div className="md:hidden">
          {view === "day" && (
            <MobileDayView
              day={currentDate}
              slots={slots}
              onShiftClick={handleShiftClick}
            />
          )}
          {(view === "week" || view === "month") && (
            <MobileWeekView
              days={
                weekDays.length > 0
                  ? weekDays
                  : Array.from({ length: 7 }, (_, i) =>
                      addDays(
                        startOfWeek(currentDate, {
                          locale: dateFnsLocale,
                          weekStartsOn: 1,
                        }),
                        i,
                      ),
                    )
              }
              slots={slots}
              onShiftClick={handleShiftClick}
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
            />
          )}
        </div>
      </div>

      {/* Confirm dialogs */}
      {confirmAction && (
        <ConfirmActionDialog
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
