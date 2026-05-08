import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  AlarmClock,
  CheckSquare,
  Clock,
  Coffee,
  History,
  TimerOff,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/shared";

import type { ShiftHistoryEvent } from "./_shared";

function historyEventIcon(type: ShiftHistoryEvent["type"]) {
  switch (type) {
    case "OPENED":
      return <Activity className="size-3.5 text-success" />;
    case "CLOSED":
      return <CheckSquare className="size-3.5 text-muted-foreground" />;
    case "FORCE_CLOSED":
      return <TimerOff className="size-3.5 text-destructive" />;
    case "LATE_MARKED":
      return <AlarmClock className="size-3.5 text-warning" />;
    case "OVERTIME_ADDED":
      return <Clock className="size-3.5 text-info" />;
    case "PAUSED":
      return <Coffee className="size-3.5 text-warning" />;
    case "RESUMED":
      return <Activity className="size-3.5 text-success" />;
    case "CANCELLED":
      return <X className="size-3.5 text-destructive" />;
    default:
      return <History className="size-3.5 text-muted-foreground" />;
  }
}

export function TabHistory({ events }: { events: ShiftHistoryEvent[] }) {
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
