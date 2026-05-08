import {
  Gift,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { EmptyState } from "@/components/shared";
import { Link } from "@/i18n/navigation";
import type { GoalProgress } from "@/lib/api/goals";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/utils/format";

import { CategoryBadge } from "./category-badge";
import { RemoveGoalDialogContent } from "./remove-goal-dialog";
import {
  SPARKLINE_DATA,
  type GoalWithUser,
  type GoalsT,
  type CommonT,
} from "./_shared";

export function ActiveGoalBanner({
  activeGoal,
  goalProgress,
  canManageGoals,
  removeDialogOpen,
  setRemoveDialogOpen,
  onRemove,
  locale,
  t,
  tCommon,
}: {
  activeGoal: GoalWithUser | null;
  goalProgress: GoalProgress | null;
  canManageGoals: boolean;
  removeDialogOpen: boolean;
  setRemoveDialogOpen: (open: boolean) => void;
  onRemove: (reason: string) => Promise<void>;
  locale: Locale;
  t: GoalsT;
  tCommon: CommonT;
}) {
  return (
    <Card className={cn("border-2", activeGoal ? "border-primary" : "border-border")}>
      <CardContent className="p-6">
        {activeGoal ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="size-5 text-primary" />
              </span>
              <Badge variant="default">{t("active_goal.badge")}</Badge>
              <CategoryBadge category={activeGoal.category} t={t} />
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              {activeGoal.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeGoal.description}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Progress */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("active_goal.stats.progress")}
                  </p>
                  <p className="text-2xl font-semibold">
                    {goalProgress
                      ? Math.round(
                          ((activeGoal.target_value - goalProgress.current_value) /
                            (activeGoal.target_value - activeGoal.current_value)) *
                            100
                        )
                      : 42}
                    %
                  </p>
                  <Progress
                    value={
                      goalProgress
                        ? ((activeGoal.target_value - goalProgress.current_value) /
                            (activeGoal.target_value - activeGoal.current_value)) *
                          100
                        : 42
                    }
                    className="h-2"
                  />
                </CardContent>
              </Card>

              {/* Current Value */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("active_goal.stats.current_value")}
                  </p>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-semibold">
                      {activeGoal.current_value}
                      {activeGoal.target_unit}
                    </p>
                    <span className="text-sm text-success mb-0.5">
                      {t("active_goal.stats.diff_better", { days: "4" })}
                    </span>
                  </div>
                  <div className="h-8" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={SPARKLINE_DATA}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="var(--color-primary)"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Days Left */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("active_goal.stats.days_left")}
                  </p>
                  <p className="text-2xl font-semibold">
                    {goalProgress?.days_left ?? 3}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(new Date(activeGoal.period_end), locale)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Set by hint */}
            {activeGoal.selected_at && activeGoal.selected_by_user && (
              <p className="text-xs text-muted-foreground">
                {t("active_goal.set_by_hint", {
                  date: formatDateTime(new Date(activeGoal.selected_at), locale),
                  user: `${activeGoal.selected_by_user.last_name} ${activeGoal.selected_by_user.first_name?.charAt(0)}.`,
                })}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`${ADMIN_ROUTES.bonusTasks}?goal_id=${activeGoal.id}`}>
                  <Gift className="size-4 mr-1" />
                  {t("actions.open_bonus_tasks")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${ADMIN_ROUTES.aiSuggestions}?goal_id=${activeGoal.id}`}>
                  <Sparkles className="size-4 mr-1" />
                  {t("actions.ai_suggestions_for_goal")}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${ADMIN_ROUTES.aiChat}?context_type=goal&context_id=${activeGoal.id}`}>
                  <MessageSquare className="size-4 mr-1" />
                  {t("actions.ask_ai_about_goal")}
                </Link>
              </Button>

              {canManageGoals ? (
                <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <X className="size-4 mr-1" />
                      {t("actions.remove_goal")}
                    </Button>
                  </AlertDialogTrigger>
                  <RemoveGoalDialogContent
                    t={t}
                    tCommon={tCommon}
                    onConfirm={onRemove}
                    onOpenChange={setRemoveDialogOpen}
                  />
                </AlertDialog>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                      <X className="size-4 mr-1" />
                      {t("actions.remove_goal")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Решение принимает супервайзер или директор сети
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title={t("active_goal.no_active_title")}
            description={t("active_goal.no_active_cta")}
          />
        )}
      </CardContent>
    </Card>
  );
}
