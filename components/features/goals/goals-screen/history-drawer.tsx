import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { pickLocalized } from "@/lib/utils/locale-pick";

import { CategoryBadge } from "./category-badge";
import type { GoalWithUser, GoalsT } from "./_shared";

export function HistoryDrawerContent({
  goals,
  locale,
  t,
}: {
  goals: GoalWithUser[];
  locale: Locale;
  t: GoalsT;
}) {
  const completedGoals = goals.filter((g) => g.status === "COMPLETED" || g.status === "ARCHIVED");

  if (completedGoals.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p className="text-sm">{t("empty.no_data_title")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {completedGoals.map((goal) => (
        <Card key={goal.id} className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <CategoryBadge category={goal.category} t={t} />
              <Badge variant={goal.status === "COMPLETED" ? "default" : "secondary"}>
                {goal.status === "COMPLETED"
                  ? t("history.status_completed")
                  : t("history.status_archived")}
              </Badge>
            </div>
            <p className="font-medium text-sm">
              {pickLocalized(goal.title, goal.title_en, locale)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(new Date(goal.period_start), locale)} — {formatDate(new Date(goal.period_end), locale)}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                {t("proposals.target_value")}: {goal.target_value}{goal.target_unit}
              </span>
              <span>
                {t("proposals.current_value")}: {goal.current_value}{goal.target_unit}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
