import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared";

import { type ShiftDetailData, formatDuration } from "./_shared";

export function TabZones({ shift }: { shift: ShiftDetailData }) {
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
        <div
          key={zone.zone_id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <MapPin className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{zone.zone_name}</p>
            <Progress
              value={Math.round((zone.minutes / total) * 100)}
              className="h-1.5 mt-1.5"
            />
          </div>
          <span className="text-sm font-medium text-foreground shrink-0">
            {formatDuration(zone.minutes)}
          </span>
        </div>
      ))}
    </div>
  );
}
