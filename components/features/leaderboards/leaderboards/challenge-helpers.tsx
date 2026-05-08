import type {
  ChallengeGoalType,
  ChallengeStatus,
} from "@/lib/api/leaderboards";

import { Badge } from "@/components/ui/badge";

import type { T } from "./_shared";

export function ChallengeBadge({
  status,
  t,
}: {
  status: ChallengeStatus;
  t: T;
}) {
  const label = t(`challenges_tab.status.${status}`);
  if (status === "ACTIVE")
    return (
      <Badge variant="default" className="text-xs">
        {label}
      </Badge>
    );
  if (status === "COMPLETED")
    return (
      <Badge variant="secondary" className="text-xs">
        {label}
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs">
      {label}
    </Badge>
  );
}

export function goalTypeLabel(type: ChallengeGoalType, t: T): string {
  return t(`create_dialog.goal_type_options.${type}`);
}
