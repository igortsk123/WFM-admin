import { useTranslations } from "next-intl";
import {
  AlarmClock,
  Clock,
  MapPin,
  MoreHorizontal,
  Store,
  TimerOff,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShiftStateBadge, StatTile } from "@/components/shared";

import { type ShiftDetailData, calcDurationMin, formatDuration, formatTime } from "./_shared";

interface HeroCardProps {
  shift: ShiftDetailData;
  onMarkLate: () => void;
  onMarkOvertime: () => void;
  onForceClose: () => void;
  onCancel: () => void;
}

export function HeroCard({
  shift,
  onMarkLate,
  onMarkOvertime,
  onForceClose,
  onCancel,
}: HeroCardProps) {
  const t = useTranslations("screen.shiftDetail");
  const plannedDurationMin = calcDurationMin(shift.planned_start, shift.planned_end);

  return (
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
                      <DropdownMenuItem onClick={onMarkLate}>
                        <AlarmClock className="size-4 mr-2 text-warning" />
                        {t("actions.mark_late")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onMarkOvertime}>
                        <TimerOff className="size-4 mr-2 text-info" />
                        {t("actions.mark_overtime")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={onForceClose}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="size-4 mr-2" />
                        {t("actions.force_close")}
                      </DropdownMenuItem>
                    </>
                  )}
                  {shift.status === "NEW" && (
                    <DropdownMenuItem
                      onClick={onCancel}
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
  );
}

// ─────────────────────────────────────────────────────────────────────
// KPI ROW
// ─────────────────────────────────────────────────────────────────────

export function KpiRow({ shift }: { shift: ShiftDetailData }) {
  const t = useTranslations("screen.shiftDetail");
  const plannedDurationMin = calcDurationMin(shift.planned_start, shift.planned_end);
  const actualDurationMin =
    shift.actual_start && shift.actual_end
      ? calcDurationMin(shift.actual_start, shift.actual_end)
      : null;
  const completedTasks = shift.tasks?.filter((task) => task.state === "COMPLETED").length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      <StatTile label={t("kpi.planned_min")} value={plannedDurationMin} size="md" />
      <StatTile label={t("kpi.actual_min")} value={actualDurationMin ?? "—"} size="md" />
      <StatTile
        label={t("kpi.late_min")}
        value={shift.late_minutes || "—"}
        colorClass={shift.late_minutes > 0 ? "text-warning" : undefined}
        size="md"
      />
      <StatTile
        label={t("kpi.overtime_min")}
        value={shift.overtime_minutes || "—"}
        colorClass={shift.overtime_minutes > 0 ? "text-info" : undefined}
        size="md"
      />
      <StatTile
        label={t("kpi.tasks_completed")}
        value={`${completedTasks}/${shift.tasks?.length ?? 0}`}
        size="md"
      />
    </div>
  );
}
