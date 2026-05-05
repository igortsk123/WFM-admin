"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Phone,
  ChevronRight,
  Store,
  MapPin,
  Clock,
  CheckSquare,
  User,
  AlarmClock,
  TimerOff,
  AlertTriangle,
  History,
  UtensilsCrossed,
  Coffee,
  MoreHorizontal,
  RefreshCw,
  ListChecks,
  X,
  Activity,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  PageHeader,
  ShiftStateBadge,
  TaskStateBadge,
  RoleBadge,
  EmptyState,
} from "@/components/shared";

import {
  getShiftById,
  getShiftHistory,
  markShiftLate,
  markShiftOvertime,
  cancelShift,
  forceCloseShift,
} from "@/lib/api/shifts";
import type {
  ShiftDetail as ShiftDetailData,
  ShiftHistoryEvent,
} from "@/lib/api/shifts";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatTime(isoOrTime: string): string {
  if (!isoOrTime) return "—";
  // Handles full ISO strings like "2026-04-29T08:00:00+07:00"
  if (isoOrTime.includes("T")) {
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return "—";
    // Format in local (Tomsk) time — extract hours/minutes from ISO offset
    const match = isoOrTime.match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  // Plain "HH:MM" or "HH:MM:SS"
  return isoOrTime.slice(0, 5);
}

function formatDate(isoDate: string, locale: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calcDurationMin(start: string, end: string): number {
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.round(ms / 60000));
  } catch {
    return 0;
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

function shiftProgressPct(shift: ShiftDetailData): number {
  if (shift.status !== "OPENED" || !shift.actual_start) return 0;
  const start = new Date(shift.actual_start).getTime();
  const end = new Date(shift.planned_end).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  const total = end - start;
  if (total <= 0) return 0;
  return Math.round(((now - start) / total) * 100);
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function historyEventIcon(type: ShiftHistoryEvent["type"]) {
  switch (type) {
    case "OPENED": return <Activity className="size-3.5 text-success" />;
    case "CLOSED": return <CheckSquare className="size-3.5 text-muted-foreground" />;
    case "FORCE_CLOSED": return <TimerOff className="size-3.5 text-destructive" />;
    case "LATE_MARKED": return <AlarmClock className="size-3.5 text-warning" />;
    case "OVERTIME_ADDED": return <Clock className="size-3.5 text-info" />;
    case "PAUSED": return <Coffee className="size-3.5 text-warning" />;
    case "RESUMED": return <Activity className="size-3.5 text-success" />;
    case "CANCELLED": return <X className="size-3.5 text-destructive" />;
    default: return <History className="size-3.5 text-muted-foreground" />;
  }
}

function breakTypeIcon(type: "lunch" | "rest" | "custom") {
  switch (type) {
    case "lunch": return <UtensilsCrossed className="size-3.5 text-muted-foreground" />;
    case "rest": return <Coffee className="size-3.5 text-muted-foreground" />;
    default: return <Clock className="size-3.5 text-muted-foreground" />;
  }
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function ShiftDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REASON DIALOG (Mark Late / Mark Overtime / Cancel — compound pattern)
// ═══════════════════════════════════════════════════════════════════

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  warning?: string;
  onConfirm: (reason: string) => Promise<void>;
  isMobile?: boolean;
}

function ReasonDialog({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  confirmLabel,
  warning,
  onConfirm,
  isMobile,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const t = useTranslations("common");

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm(reason);
      setReason("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const body = (
    <div className="space-y-3">
      {warning && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-sm">{warning}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="reason-input" className="text-sm font-medium">
          {label}
        </Label>
        <Textarea
          id="reason-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );

  const actions = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
        {t("cancel")}
      </Button>
      <Button onClick={handleConfirm} disabled={!reason.trim() || saving}>
        {saving ? t("loading") : confirmLabel}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {body}
          <SheetFooter className="mt-4 flex-row gap-2">
            {actions}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {body}
        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FORCE CLOSE DIALOG
// ═══════════════════════════════════════════════════════════════════

interface ForceCloseDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hasActiveTasks: boolean;
  onConfirm: () => Promise<void>;
}

function ForceCloseDialog({ open, onOpenChange, hasActiveTasks, onConfirm }: ForceCloseDialogProps) {
  const t = useTranslations("screen.shiftDetail");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogs.force_close_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {hasActiveTasks
              ? "На смене есть задачи в работе. Они будут переведены в PAUSED. Точно закрыть?"
              : t("dialogs.force_close_description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasActiveTasks && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-sm">
              Активные задачи перейдут в статус «На паузе».
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving ? tc("loading") : t("dialogs.force_close_confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PLAN VS FACT CARD
// ═══════════════════════════════════════════════════════════════════

function PlanVsFactCard({ shift }: { shift: ShiftDetailData }) {
  const t = useTranslations("screen.shiftDetail");
  const progress = shiftProgressPct(shift);

  const plannedDuration = calcDurationMin(shift.planned_start, shift.planned_end);
  const actualDuration =
    shift.actual_start && shift.actual_end
      ? calcDurationMin(shift.actual_start, shift.actual_end)
      : shift.actual_start
      ? calcDurationMin(shift.actual_start, new Date().toISOString())
      : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("overview.planned_label")} vs {t("overview.actual_label")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* PLAN */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("overview.planned_label")}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Начало</span>
                <span className="font-medium font-mono">{formatTime(shift.planned_start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Окончание</span>
                <span className="font-medium font-mono">{formatTime(shift.planned_end)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Длительность</span>
                <span className="font-medium">{formatDuration(plannedDuration)}</span>
              </div>
            </div>
          </div>

          {/* FACT */}
          <div
            className={cn(
              "rounded-lg p-3 space-y-2",
              shift.actual_start ? "bg-success/5 border border-success/20" : "bg-muted/20"
            )}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("overview.actual_label")}
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Открыта</span>
                {shift.actual_start ? (
                  <span
                    className={cn(
                      "font-medium font-mono",
                      shift.late_minutes > 0 ? "text-warning" : ""
                    )}
                  >
                    {formatTime(shift.actual_start)}
                    {shift.late_minutes > 0 && (
                      <span className="ml-1 text-xs text-warning">+{shift.late_minutes} мин</span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Закрыта</span>
                {shift.actual_end ? (
                  <span className="font-medium font-mono">{formatTime(shift.actual_end)}</span>
                ) : shift.status === "OPENED" ? (
                  <span className="text-info text-xs font-medium">В работе</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Длительность</span>
                <span className="font-medium">
                  {actualDuration !== null ? formatDuration(actualDuration) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {shift.status === "OPENED" && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Прогресс смены</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {(shift.late_reason || shift.overtime_reason) && (
          <div className="space-y-1.5 border-t border-border pt-3 text-sm">
            {shift.late_reason && (
              <div>
                <span className="text-muted-foreground">{t("overview.late_reason_label")}: </span>
                <span className="text-foreground">{shift.late_reason}</span>
              </div>
            )}
            {shift.overtime_reason && (
              <div>
                <span className="text-muted-foreground">{t("overview.overtime_reason_label")}: </span>
                <span className="text-foreground">{shift.overtime_reason}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TASKS TAB
// ═══════════════════════════════════════════════════════════════════

function TasksTab({ shift }: { shift: ShiftDetailData }) {
  const t = useTranslations("screen.shiftDetail");

  if (!shift.tasks || shift.tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title={t("tasks.empty")}
        description=""
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-2">
      {shift.tasks.map((task) => (
        <Link
          key={task.id}
          href={ADMIN_ROUTES.taskDetail(task.id)}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors group min-h-11"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <ListChecks className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{task.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {task.zone_name && (
                <span className="text-xs text-muted-foreground">{task.zone_name}</span>
              )}
              {task.planned_minutes && (
                <span className="text-xs text-muted-foreground">
                  · {task.planned_minutes} мин
                </span>
              )}
              {task.actual_minutes && (
                <span className="text-xs text-muted-foreground">
                  · факт {task.actual_minutes} мин
                </span>
              )}
            </div>
            {/* Mobile second row */}
            <div className="flex items-center gap-2 mt-1.5 md:hidden">
              <TaskStateBadge state={task.state} size="sm" />
            </div>
          </div>
          {/* Desktop badge */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <TaskStateBadge state={task.state} size="sm" />
          </div>
          <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
      <div className="pt-2 md:hidden">
        <Button variant="outline" className="w-full" asChild>
          <Link href={ADMIN_ROUTES.tasks}>Открыть в задачах</Link>
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ZONES TAB
// ═══════════════════════════════════════════════════════════════════

function ZonesTab({ shift }: { shift: ShiftDetailData }) {
  const t = useTranslations("screen.shiftDetail");

  if (!shift.zone_breakdown || shift.zone_breakdown.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={t("zones.no_breakdown")}
        description=""
        className="py-12"
      />
    );
  }

  const total = shift.zone_breakdown.reduce((s, z) => s + z.minutes, 0);

  return (
    <div className="space-y-2">
      {shift.zone_breakdown.map((zone) => (
        <div key={zone.zone_id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <MapPin className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{zone.zone_name}</p>
            <Progress value={Math.round((zone.minutes / total) * 100)} className="h-1.5 mt-1.5" />
          </div>
          <span className="text-sm font-medium text-foreground shrink-0">
            {formatDuration(zone.minutes)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BREAKS TAB
// ═══════════════════════════════════════════════════════════════════

function BreaksTab({ shift }: { shift: ShiftDetailData }) {
  const t = useTranslations("screen.shiftDetail");

  const typeLabel = (type: "lunch" | "rest" | "custom") => {
    if (type === "lunch") return t("breaks.type_lunch");
    if (type === "rest") return t("breaks.type_rest");
    return t("breaks.type_custom");
  };

  if (!shift.breaks || shift.breaks.length === 0) {
    return (
      <EmptyState
        icon={Coffee}
        title={t("breaks.no_breaks")}
        description=""
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-2">
      {shift.breaks.map((brk, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            {breakTypeIcon(brk.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{typeLabel(brk.type)}</p>
            <p className="text-xs text-muted-foreground">
              {brk.from} → {brk.to}
            </p>
          </div>
          <span className="text-sm text-muted-foreground shrink-0 font-mono">
            {brk.from}–{brk.to}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════════

function HistoryTab({ events }: { events: ShiftHistoryEvent[] }) {
  const t = useTranslations("screen.shiftDetail");
  const locale = useLocale();

  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={t("history.empty")}
        description=""
        className="py-12"
      />
    );
  }

  return (
    <div className="relative pl-5 md:pl-8 border-l-2 border-border ml-2 md:ml-4 space-y-4">
      {events.map((event) => {
        const typeKey = `history.type_${event.type}` as Parameters<typeof t>[0];
        return (
          <div key={event.id} className="relative">
            {/* Dot */}
            <div className="absolute -left-[22px] md:-left-[30px] flex size-5 md:size-6 items-center justify-center rounded-full bg-card border-2 border-border">
              {historyEventIcon(event.type)}
            </div>
            <div className="space-y-0.5 pl-1">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{t(typeKey)}</span>
                <span className="text-xs text-muted-foreground font-mono mt-0.5">
                  {new Date(event.ts).toLocaleTimeString(locale === "en" ? "en-GB" : "ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("history.by_label")}: {event.by_user_name}
              </p>
              {event.details && (
                <p className="text-xs text-muted-foreground">{event.details}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR CARDS
// ═══════════════════════════════════════════════════════════════════

function EmployeeCard({ shift }: { shift: ShiftDetailData }) {
  const t = useTranslations("screen.shiftDetail");
  const user = {
    id: shift.user_id,
    name: shift.user_name,
    avatarUrl: shift.user_avatar_url,
    positionName: shift.position_name,
  };

  const initials = getInitials(user.name);
  const completedTasks = shift.tasks?.filter((t) => t.state === "COMPLETED").length ?? 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-14 shrink-0">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{user.name}</p>
            {user.positionName && (
              <p className="text-xs text-muted-foreground mt-0.5">{user.positionName}</p>
            )}
            <div className="mt-1.5">
              <RoleBadge role="WORKER" size="sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" className="flex-1 min-h-[36px]" asChild>
            <Link href={ADMIN_ROUTES.employeeDetail(String(user.id))}>
              <User className="size-3.5 mr-1.5" />
              Профиль
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 min-h-[36px]">
            <Phone className="size-3.5 mr-1.5" />
            Связаться
          </Button>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-3">
          <div className="flex justify-between">
            <span>Задач завершено</span>
            <span className="font-medium text-foreground">{completedTasks}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StoreCard({ shift }: { shift: ShiftDetailData }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Store className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{shift.store_name}</p>
            {shift.zone_name && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="size-3" />
                {shift.zone_name}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full min-h-[36px]" asChild>
          <Link href={ADMIN_ROUTES.storeDetail(String(shift.store_id))}>
            Открыть магазин
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatsCard({ shift }: { shift: ShiftDetailData }) {
  const completedTasks = shift.tasks?.filter((t) => t.state === "COMPLETED").length ?? 0;
  const totalTasks = shift.tasks?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Статистика смены
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {shift.late_minutes > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Опоздание</span>
            <span className="text-warning font-medium">{shift.late_minutes} мин</span>
          </div>
        )}
        {shift.overtime_minutes > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Переработка</span>
            <span className="text-info font-medium">{shift.overtime_minutes} мин</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Завершено задач</span>
          <span className="font-medium">
            {completedTasks} / {totalTasks}
          </span>
        </div>
        {shift.late_minutes === 0 && shift.overtime_minutes === 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Опоздание</span>
            <span className="text-success font-medium">—</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditCard({ shift }: { shift: ShiftDetailData }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Аудит
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {shift.audit?.slice(0, 3).map((entry) => (
          <div key={entry.id} className="text-xs space-y-0.5">
            <p className="font-medium text-foreground">{entry.action_label}</p>
            <p className="text-muted-foreground">
              {entry.actor.name} ·{" "}
              {new Date(entry.occurred_at).toLocaleDateString("ru-RU")}
            </p>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground mt-1"
          asChild
        >
          <Link href={`${ADMIN_ROUTES.audit}?entity_id=${shift.id}`}>
            Полный аудит →
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ShiftDetail({ shiftId }: { shiftId: number }) {
  const t = useTranslations("screen.shiftDetail");
  const tc = useTranslations("common");
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

  const plannedDurationMin = calcDurationMin(shift.planned_start, shift.planned_end);
  const actualDurationMin =
    shift.actual_start && shift.actual_end
      ? calcDurationMin(shift.actual_start, shift.actual_end)
      : null;
  const completedTasks = shift.tasks?.filter((t) => t.state === "COMPLETED").length ?? 0;
  const hasActiveTasks = shift.tasks?.some((t) => t.state === "IN_PROGRESS") ?? false;

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
        <Card>
          <CardContent className="p-4 md:p-6 space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <ShiftStateBadge status={shift.status} />
                <Badge variant="outline" className="text-xs">
                  <Store className="size-3 mr-1" />
                  {shift.store_name}
                </Badge>
                {shift.zone_name && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="size-3 mr-1" />
                    {shift.zone_name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <Clock className="size-3 mr-1" />
                  {formatDuration(plannedDurationMin)}
                </Badge>
              </div>
              {/* Actions dropdown for extra actions (OPENED shifts) */}
              {(shift.status === "OPENED" || shift.status === "NEW") && (
                <div className="ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="min-h-[36px]">
                        <MoreHorizontal className="size-4 mr-1.5" />
                        {t("actions.more")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {shift.status === "OPENED" && (
                        <>
                          <DropdownMenuItem onClick={() => setLateDialogOpen(true)}>
                            <AlarmClock className="size-4 mr-2 text-warning" />
                            {t("actions.mark_late")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setOvertimeDialogOpen(true)}>
                            <TimerOff className="size-4 mr-2 text-info" />
                            {t("actions.mark_overtime")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setForceCloseOpen(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="size-4 mr-2" />
                            {t("actions.force_close")}
                          </DropdownMenuItem>
                        </>
                      )}
                      {shift.status === "NEW" && (
                        <DropdownMenuItem
                          onClick={() => setCancelDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <X className="size-4 mr-2" />
                          {t("actions.cancel_shift")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Time range display */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" />
              <span className="font-mono font-medium text-foreground">
                {formatTime(shift.planned_start)}–{formatTime(shift.planned_end)}
              </span>
              <span>·</span>
              <span>{shift.shift_date}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── KPI ROW ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t("kpi.planned_min")}</p>
            <p className="text-xl font-semibold">{plannedDurationMin}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t("kpi.actual_min")}</p>
            <p className="text-xl font-semibold">{actualDurationMin ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t("kpi.late_min")}</p>
            <p
              className={cn(
                "text-xl font-semibold",
                shift.late_minutes > 0 ? "text-warning" : ""
              )}
            >
              {shift.late_minutes || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t("kpi.overtime_min")}</p>
            <p
              className={cn(
                "text-xl font-semibold",
                shift.overtime_minutes > 0 ? "text-info" : ""
              )}
            >
              {shift.overtime_minutes || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{t("kpi.tasks_completed")}</p>
            <p className="text-xl font-semibold">
              {completedTasks}/{shift.tasks?.length ?? 0}
            </p>
          </div>
        </div>

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
                    <TasksTab shift={shift} />
                  </TabsContent>
                  <TabsContent value="history">
                    <HistoryTab events={history} />
                  </TabsContent>
                  <TabsContent value="zones">
                    <ZonesTab shift={shift} />
                  </TabsContent>
                  <TabsContent value="breaks">
                    <BreaksTab shift={shift} />
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
