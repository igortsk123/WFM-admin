import {
  Coins,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { computeGoalProgressWithCurrent } from "@/lib/utils/goals-progress";

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
  const progressPct = activeGoal
    ? computeGoalProgressWithCurrent(
        activeGoal,
        goalProgress?.current_value ?? activeGoal.current_value
      )
    : 0;

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
                    {progressPct}%
                  </p>
                  <Progress value={progressPct} className="h-2" />
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

            {/* Money impact */}
            {activeGoal.money_impact && (
              <MoneyImpactPill
                impact={activeGoal.money_impact}
                goalId={activeGoal.id}
                locale={locale}
                t={t}
              />
            )}

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

// ─────────────────────────────────────────────────────────────────────
// Money impact — пилюля с popover'ом «Подробнее»
// ─────────────────────────────────────────────────────────────────────

function MoneyImpactPill({
  impact,
  goalId,
  locale,
  t,
}: {
  impact: NonNullable<GoalWithUser["money_impact"]>;
  goalId: string;
  locale: Locale;
  t: GoalsT;
}) {
  const formattedAmount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(impact.amount);

  const periodLabel = t(`active_goal.money.period.${impact.period}`);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex w-full items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-3 text-left",
            "hover:bg-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success",
            "transition-colors"
          )}
          aria-label={t("active_goal.money.aria_open_breakdown")}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/20">
            <Coins className="size-4 text-success" aria-hidden="true" />
          </span>
          <span className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xs font-medium text-success">
                {t("active_goal.money.label")}
              </span>
              <span className="text-base font-semibold tabular-nums">
                +{formattedAmount}/{periodLabel}
              </span>
            </span>
            <span className="text-xs text-muted-foreground line-clamp-2">
              {impact.rationale_short}
            </span>
          </span>
          <span className="text-xs font-medium text-success shrink-0 self-center">
            {t("active_goal.money.details")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(420px,calc(100vw-2rem))] p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t("active_goal.money.label")}
          </p>
          <p className="text-xl font-semibold tabular-nums">
            +{formattedAmount}/{periodLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            {impact.rationale_short}
          </p>
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
            {t("active_goal.money.breakdown_title")}
          </p>
          <ul className="space-y-1.5 text-sm">
            {impact.rationale_breakdown.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-success mt-1.5 size-1 rounded-full bg-success shrink-0" aria-hidden="true" />
                <span className="text-foreground leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button asChild variant="default" size="sm" className="w-full">
          <Link href={`${ADMIN_ROUTES.aiChat}?context_type=goal&context_id=${goalId}`}>
            <MessageSquare className="size-4 mr-1.5" aria-hidden="true" />
            {t("active_goal.money.details_in_ai_chat")}
          </Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
