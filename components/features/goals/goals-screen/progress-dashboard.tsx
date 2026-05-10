import { Plus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import type { GoalProgress } from "@/lib/api/goals";
import type { Locale } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { computeGoalProgressWithCurrent } from "@/lib/utils/goals-progress";

import {
  SPARKLINE_DATA,
  type GoalWithUser,
  type GoalsT,
} from "./_shared";

export function ProgressDashboard({
  activeGoal,
  goalProgress,
  locale,
  t,
}: {
  activeGoal: GoalWithUser;
  goalProgress: GoalProgress;
  locale: Locale;
  t: GoalsT;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("progress_dashboard.section_title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Q1: Where are we now? */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">{t("progress_dashboard.q1_title")}</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-semibold">
                  {goalProgress.current_value}
                  {activeGoal.target_unit}
                </p>
              </div>
              <div className="h-12" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={SPARKLINE_DATA}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Q2: Where are we headed? */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">{t("progress_dashboard.q2_title")}</p>
              <Progress
                value={computeGoalProgressWithCurrent(
                  activeGoal,
                  goalProgress.current_value
                )}
                className="h-3"
              />
              <p className="text-xs text-muted-foreground">
                {t("progress_dashboard.q2_eta", {
                  date: formatDate(new Date(goalProgress.eta_date), locale),
                })}
              </p>
            </CardContent>
          </Card>

          {/* Q3: What to do today? */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">{t("progress_dashboard.q3_title")}</p>
              <div className="space-y-2">
                {goalProgress.recommended_subtasks.slice(0, 3).map((subtask, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{subtask}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 shrink-0">
                      <Plus className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
