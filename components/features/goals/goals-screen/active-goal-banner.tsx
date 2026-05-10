import {
  ArrowDown,
  ArrowUp,
  Coins,
  Gift,
  MessageSquare,
  Sparkles,
  Target,
  X,
} from "lucide-react";

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
import { computeGoalProgressWithCurrent, inferGoalDirection } from "@/lib/utils/goals-progress";
import { pickLocalized } from "@/lib/utils/locale-pick";

import { AIEvidenceSection } from "./ai-evidence-section";
import { CategoryBadge } from "./category-badge";
import { MoneyPill } from "./money-pill";
import { PilotWaveBadge } from "./pilot-wave-badge";
import { RemoveGoalDialogContent } from "./remove-goal-dialog";
import {
  type GoalWithUser,
  type GoalsT,
  type CommonT,
} from "./_shared";

// ─────────────────────────────────────────────────────────────────────
// Историческая «скорость улучшения» для блока «Реалистично потому что».
// Демо-цифры (mock). Реальный backend пришлёт из исторических данных.
// ─────────────────────────────────────────────────────────────────────
const HISTORICAL_PACE_DAYS = 3;

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
  if (!activeGoal) {
    return (
      <Card className="border-2 border-border">
        <CardContent className="p-6">
          <EmptyState
            icon={Sparkles}
            title={t("active_goal.no_active_title")}
            description={t("active_goal.no_active_cta")}
          />
        </CardContent>
      </Card>
    );
  }

  const currentValue = goalProgress?.current_value ?? activeGoal.current_value;
  const startingValue = activeGoal.starting_value ?? activeGoal.current_value;
  const targetValue = activeGoal.target_value;
  const unit = activeGoal.target_unit;
  const direction = inferGoalDirection({
    starting_value: activeGoal.starting_value,
    current_value: currentValue,
    target_value: targetValue,
    direction: activeGoal.direction,
  });

  const progressPct = computeGoalProgressWithCurrent(activeGoal, currentValue);

  // Дельта между было / сейчас. Знак — для иконки тренда.
  const rawDelta = currentValue - startingValue;
  const deltaAbs = Math.abs(rawDelta);
  // «Хороший» тренд: для decrease — current<starting; для increase — current>starting.
  const isImproving =
    direction === "decrease" ? rawDelta < 0 : rawDelta > 0;
  const isUnit_pp = unit === "%";

  // Дни прошло с момента активации цели (для «было N дн. назад»).
  const today = new Date("2026-05-01"); // совпадает с моком getGoalProgress
  const periodStart = new Date(activeGoal.period_start);
  const daysSinceStart = Math.max(
    1,
    Math.round(
      (today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  // Локализованные тексты
  const localizedTitle = pickLocalized(activeGoal.title, activeGoal.title_en, locale);
  const localizedDescription = pickLocalized(
    activeGoal.description,
    activeGoal.description_en,
    locale
  );

  return (
    <Card className="border-2 border-primary">
      <CardContent className="p-6 space-y-5">
        {/* ── Header: badge + category + money pill ─────────────────── */}
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </span>
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
            <Badge variant="default">{t("active_goal.badge")}</Badge>
            <CategoryBadge category={activeGoal.category} t={t} />
            <PilotWaveBadge
              tier={activeGoal.tier}
              wave={activeGoal.pilot_wave}
              t={t}
            />
          </div>
          {activeGoal.money_impact && (
            <MoneyPill
              impact={activeGoal.money_impact}
              goalId={activeGoal.id}
              locale={locale}
              t={t}
            />
          )}
        </div>

        {/* ── Title + description ───────────────────────────────────── */}
        <div className="space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            {localizedTitle}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {localizedDescription}
          </p>
        </div>

        {/* ── Narrative row: Было → Сейчас → Прогресс к цели ────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-4">
          {/* Было */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("active_goal.narrative.was")}
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              {startingValue}
              <span className="text-lg font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>

          {/* Сейчас + дельта */}
          <div className="space-y-1 sm:border-l sm:border-border sm:pl-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("active_goal.narrative.now")}
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              {currentValue}
              <span className="text-lg font-normal text-muted-foreground">{unit}</span>
            </p>
            {deltaAbs > 0 && (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs font-medium tabular-nums",
                  isImproving ? "text-success" : "text-destructive"
                )}
              >
                {rawDelta < 0 ? (
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                ) : (
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                )}
                {isUnit_pp
                  ? t("active_goal.narrative.delta_pp_over_days", {
                      delta: formatSignedNumber(rawDelta),
                      days: daysSinceStart,
                    })
                  : t("active_goal.narrative.delta_units_over_days", {
                      delta: formatSignedNumber(rawDelta),
                      unit,
                      days: daysSinceStart,
                    })}
              </p>
            )}
          </div>

          {/* Прогресс к цели — пилл, не доминирующая метрика */}
          <div className="space-y-2 sm:border-l sm:border-border sm:pl-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("active_goal.narrative.progress_to_goal")}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold tabular-nums">{progressPct}%</span>
              {activeGoal.money_impact && (
                <EarnedSoFarBadge
                  totalAmount={activeGoal.money_impact.amount}
                  progressPct={progressPct}
                  locale={locale}
                  t={t}
                />
              )}
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </div>

        {/* ── Куда идём + Реалистично + При достижении ──────────────── */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Target className="size-4 text-primary" aria-hidden="true" />
            </span>
            <div className="flex-1 space-y-2 min-w-0">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("active_goal.narrative.where_we_go")}
                </p>
                <p className="text-sm font-medium mt-1">
                  {t("active_goal.narrative.target_full", {
                    target: targetValue,
                    unit,
                    date: formatDate(new Date(activeGoal.period_end), locale),
                  })}
                  {goalProgress?.days_left !== undefined && (
                    <span className="text-muted-foreground font-normal">
                      {" — "}
                      {t("active_goal.narrative.days_remaining", {
                        days: goalProgress.days_left,
                      })}
                    </span>
                  )}
                </p>
              </div>

              {/* Реалистично потому что */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">
                  {t("active_goal.narrative.realistic_because")}
                </span>
                {": "}
                {isUnit_pp
                  ? t("active_goal.narrative.pace_pp", {
                      pace: deltaAbs > 0 ? formatPaceNumber(deltaAbs) : "0.3",
                      days: HISTORICAL_PACE_DAYS,
                    })
                  : t("active_goal.narrative.pace_units", {
                      pace: deltaAbs > 0 ? formatPaceNumber(deltaAbs) : "0.3",
                      unit,
                      days: HISTORICAL_PACE_DAYS,
                    })}
              </p>

              {/* + ещё столько-то денег при достижении */}
              {activeGoal.money_impact && (
                <p className="text-xs text-success font-medium">
                  <Coins className="inline size-3.5 mr-1 -mt-0.5" aria-hidden="true" />
                  {t("active_goal.narrative.at_target_money", {
                    amount: formatRubleAmount(
                      remainingMoney(activeGoal.money_impact.amount, progressPct),
                      locale
                    ),
                    period: t(
                      `active_goal.money.period.${activeGoal.money_impact.period}` as Parameters<typeof t>[0]
                    ),
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── «Откуда AI это взял?» — прозрачность signal'а ─────────── */}
        <AIEvidenceSection
          signalSource={activeGoal.ai_signal_source}
          detectionMethod={activeGoal.ai_detection_method}
          detectionMethodEn={activeGoal.ai_detection_method_en}
          evidence={activeGoal.ai_evidence}
          locale={locale}
          t={t}
        />

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
        <div className="flex flex-wrap gap-2">
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
              {t("active_goal.narrative.discuss_in_ai_chat")}
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
                {t("active_goal.remove_disabled_hint")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

function formatSignedNumber(n: number): string {
  // Сохраняем знак (− для отрицательных, + для положительных)
  const abs = Math.abs(n).toFixed(1).replace(/\.0$/, "");
  return n < 0 ? `−${abs}` : `+${abs}`;
}

function formatPaceNumber(n: number): string {
  // Темп показываем как абсолютное число с 1 десятичной (или без, если целое)
  return Math.abs(n).toFixed(1).replace(/\.0$/, "");
}

function formatRubleAmount(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

function remainingMoney(totalAmount: number, progressPct: number): number {
  // Сколько ещё денег принесёт при достижении 100% от текущего прогресса.
  return Math.round((totalAmount * (100 - progressPct)) / 100);
}

// ─────────────────────────────────────────────────────────────────────
// «Уже принесло» — компактный пилл рядом с %
// ─────────────────────────────────────────────────────────────────────

function EarnedSoFarBadge({
  totalAmount,
  progressPct,
  locale,
  t,
}: {
  totalAmount: number;
  progressPct: number;
  locale: Locale;
  t: GoalsT;
}) {
  if (progressPct === 0) return null;
  const earned = Math.round((totalAmount * progressPct) / 100);
  const formatted = formatRubleAmount(earned, locale);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5",
            "text-xs font-medium text-success tabular-nums"
          )}
        >
          <Coins className="size-3" aria-hidden="true" />
          +{formatted}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("active_goal.narrative.earned_so_far_label")}: +{formatted}
      </TooltipContent>
    </Tooltip>
  );
}

