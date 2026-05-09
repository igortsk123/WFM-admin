import { MapPinOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { UserCell } from "@/components/shared/user-cell";
import type { FreelancerAssignment } from "@/lib/types";

import { formatTime } from "./_shared";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Запланирован",
  CHECKED_IN: "Отметился",
  WORKING: "На объекте",
};

export function TodayAssignmentRow({
  assignment,
}: {
  assignment: FreelancerAssignment;
}) {
  const geoMismatch = assignment.geo_check_in_match === false;
  const nameParts = assignment.freelancer_name.split(" ");

  const userCellUser = {
    last_name: nameParts[0] ?? "",
    first_name: nameParts[1] ?? "",
    middle_name: nameParts[2],
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors min-h-[44px]">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <UserCell user={userCellUser} />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-[42px]">
          <span>
            {formatTime(assignment.scheduled_start)}–
            {formatTime(assignment.scheduled_end)}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {geoMismatch ? (
          <Badge
            variant="destructive"
            className="text-xs h-5 flex items-center gap-1"
          >
            <MapPinOff className="size-3" aria-hidden="true" />
            Не на объекте
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs h-5">
            {STATUS_LABEL[assignment.status] ?? assignment.status}
          </Badge>
        )}
      </div>
    </div>
  );
}
