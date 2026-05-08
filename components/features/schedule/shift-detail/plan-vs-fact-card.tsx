import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import {
  type ShiftDetailData,
  calcDurationMin,
  formatDuration,
  formatTime,
  shiftProgressPct,
} from "./_shared";

export function PlanVsFactCard({ shift }: { shift: ShiftDetailData }) {
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
