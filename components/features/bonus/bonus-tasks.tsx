"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Wallet,
  Settings2,
  Recycle,
  Target,
  Plus,
  Clock,
  Sparkles,
  MessageSquare,
  X,
  Timer,
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PageHeader, EmptyState, ConfirmDialog, UserCell } from "@/components/shared";
import type { FunctionalRole, BonusBudget, BonusTaskSource, Goal, Locale } from "@/lib/types";
import {
  getBonusBudgets,
  getBonusProposals,
  createBonusTask,
  removeBonusTask,
  getBonusMetrics,
  type BonusMetrics,
} from "@/lib/api/bonus";
import { MOCK_BONUS_TASKS, MOCK_GOALS, type BonusTask } from "@/lib/mock-data/future-placeholders";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type PeriodFilter = "today" | "week" | "prev_week" | "custom";

interface StrategiesState {
  manual: boolean;
  ai: boolean;
  yesterday: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const POINTS_TO_RUBLES = 1; // 1 point = 1 ruble
const HOUR_TO_POINTS = 500; // 1 hour ≈ 500 points (simplified)

// Mock scope options
const MOCK_SCOPE_OPTIONS = [
  { id: "all", name: "Все магазины" },
  ...MOCK_STORES.filter((s) => !s.archived).map((s) => ({
    id: String(s.id),
    name: s.name,
  })),
];

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

function AILoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="size-8 text-primary animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function BonusTaskStatusBadge({ state }: { state: BonusTask["state"] }) {
  const variants: Record<BonusTask["state"], { className: string; label: string }> = {
    ACTIVE: { className: "bg-info text-info-foreground", label: "Новая" },
    COMPLETED: { className: "bg-success text-success-foreground", label: "На проверке" },
    PROPOSED: { className: "bg-warning text-warning-foreground", label: "Предложена" },
  };
  const v = variants[state] || variants.ACTIVE;
  return <Badge className={v.className}>{v.label}</Badge>;
}

function SourceBadge({ source, t }: { source: BonusTaskSource; t: (key: string) => string }) {
  const variants: Record<BonusTaskSource, { className: string }> = {
    YESTERDAY_INCOMPLETE: { className: "bg-warning/10 text-warning border-warning/20" },
    SUPERVISOR_BUDGET: { className: "bg-primary/10 text-primary border-primary/20" },
    GOAL_LINKED: { className: "bg-success/10 text-success border-success/20" },
  };
  const v = variants[source] || variants.SUPERVISOR_BUDGET;
  return (
    <Badge variant="outline" className={v.className}>
      {t(`completed_tab.source.${source}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET CARD
// ═══════════════════════════════════════════════════════════════════

function BudgetCard({
  budgets,
  isReadOnly,
  canEditBudget,
  scopeId,
  t,
  tCommon,
  locale,
  onEditBudget,
}: {
  budgets: BonusBudget[];
  isReadOnly: boolean;
  canEditBudget: boolean;
  scopeId: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  tCommon: (key: string) => string;
  locale: Locale;
  onEditBudget: () => void;
}) {
  const [showMoney, setShowMoney] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  // Calculate totals
  const totalPoints = budgets.reduce((sum, b) => sum + b.total_points, 0);
  const spentPoints = budgets.reduce((sum, b) => sum + b.spent_points, 0);
  const usedPercent = totalPoints > 0 ? Math.round((spentPoints / totalPoints) * 100) : 0;

  const totalHours = Math.round(totalPoints / HOUR_TO_POINTS);
  const spentHours = Math.round(spentPoints / HOUR_TO_POINTS);

  const totalMoney = totalPoints * POINTS_TO_RUBLES;
  const spentMoney = spentPoints * POINTS_TO_RUBLES;

  // Per-store breakdown
  const storeBreakdown = budgets
    .filter((b) => b.store_id)
    .map((b) => {
      const store = MOCK_STORES.find((s) => s.id === b.store_id);
      const pct = b.total_points > 0 ? Math.round((b.spent_points / b.total_points) * 100) : 0;
      return {
        storeId: b.store_id!,
        storeName: store?.name || `Store ${b.store_id}`,
        total: b.total_points,
        spent: b.spent_points,
        pct,
      };
    });

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="size-5 text-primary" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{t("budget_card.title")}</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {t("budget_card.regional_badge")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="toggle-unit" className="text-xs text-muted-foreground">
              {showMoney ? t("budget_card.toggle_money") : t("budget_card.toggle_hours")}
            </Label>
            <Switch
              id="toggle-unit"
              checked={showMoney}
              onCheckedChange={setShowMoney}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {showMoney
                ? formatCurrency(totalMoney, locale)
                : `${totalHours} ${t("budget_card.hours_unit")}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("budget_card.used_label", {
                value: showMoney
                  ? formatCurrency(spentMoney, locale)
                  : `${spentHours} ч`,
                percent: usedPercent,
              })}
            </p>
          </div>

          <Progress value={usedPercent} className="h-2" />

          {storeBreakdown.length > 0 && (
            <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between px-0 h-8">
                  <span className="text-sm text-muted-foreground">
                    {t("budget_card.summary_collapse_title")}
                  </span>
                  {summaryOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                {storeBreakdown.map((s) => (
                  <div key={s.storeId} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate max-w-[60%]">
                      {s.storeName}
                    </span>
                    <span className="text-foreground">
                      {showMoney
                        ? `${formatCurrency(s.spent * POINTS_TO_RUBLES, locale)} (${s.pct}%)`
                        : `${Math.round(s.spent / HOUR_TO_POINTS)} ч (${s.pct}%)`}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          {canEditBudget ? (
            <Button variant="outline" size="sm" className="w-full" onClick={onEditBudget}>
              {t("actions.edit_budget")}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              {t("budget_card.set_by_regional_hint")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STRATEGIES CARD
// ═══════════════════════════════════════════════════════════════════

function StrategiesCard({
  strategies,
  isReadOnly,
  t,
  onToggle,
}: {
  strategies: StrategiesState;
  isReadOnly: boolean;
  t: (key: string) => string;
  onToggle: (key: keyof StrategiesState, value: boolean) => void;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-info/10">
            <Settings2 className="size-5 text-info" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{t("strategies_card.title")}</p>
            <Badge variant="secondary" className="text-xs mt-1">
              {t("strategies_card.title")}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("strategies_card.manual_label")}</p>
              <p className="text-xs text-muted-foreground">{t("strategies_card.manual_hint")}</p>
            </div>
            <Switch
              checked={strategies.manual}
              onCheckedChange={(v) => onToggle("manual", v)}
              disabled={isReadOnly}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("strategies_card.ai_label")}</p>
              <p className="text-xs text-muted-foreground">{t("strategies_card.ai_hint")}</p>
            </div>
            <Switch
              checked={strategies.ai}
              onCheckedChange={(v) => onToggle("ai", v)}
              disabled={isReadOnly}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("strategies_card.yesterday_label")}</p>
              <p className="text-xs text-muted-foreground">{t("strategies_card.yesterday_hint")}</p>
            </div>
            <Switch
              checked={strategies.yesterday}
              onCheckedChange={(v) => onToggle("yesterday", v)}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
          {t("strategies_card.footer_hint")}
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// YESTERDAY POOL CARD
// ═══════════════════════════════════════════════════════════════════

function YesterdayPoolCard({
  t,
  onViewPool,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  onViewPool: () => void;
}) {
  // Mock data
  const tasksCount = 12;
  const hoursStr = "4 ч 30 мин";
  const used = 600;
  const total = 1500;
  const usedPct = Math.round((used / total) * 100);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-warning/10">
            <Recycle className="size-5 text-warning" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{t("yesterday_pool_card.title")}</p>
            <Badge variant="secondary" className="text-xs mt-1">
              {t("yesterday_pool_card.auto_badge")}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-2xl font-semibold text-foreground">
            {t("yesterday_pool_card.tasks_summary", { tasks: tasksCount, hours: hoursStr })}
          </p>
          <Progress value={usedPct} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {t("yesterday_pool_card.used_label", { used, total })}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="w-full" onClick={onViewPool}>
            {t("actions.view_pool")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACTIVE GOAL CARD
// ═══════════════════════════════════════════════════════════════════

function ActiveGoalCard({
  goal,
  proposalsCount,
  t,
}: {
  goal: Goal | null;
  proposalsCount: number;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (!goal) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-success/10">
            <Target className="size-5 text-success" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{t("active_goal_card.title")}</p>
            <Badge variant="secondary" className="text-xs mt-1">
              {t("active_goal_card.ai_badge")}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">{goal.title}</p>
          <p className="text-sm text-muted-foreground">
            {t("active_goal_card.proposals_count", { count: proposalsCount })}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={ADMIN_ROUTES.goals}>
              {t("actions.open_goal")}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BONUS TASK CARD (Active tab)
// ═══════════════════════════════════════════════════════════════════

function BonusTaskCard({
  task,
  isReadOnly,
  t,
  onRemove,
}: {
  task: BonusTask;
  isReadOnly: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  onRemove: (id: string) => void;
}) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const expiresIn = "2 ч"; // mock

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
            +{task.bonus_points} {t("task_card.points_suffix")}
          </Badge>
          <BonusTaskStatusBadge state={task.state} />
        </div>

        <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{task.title}</h3>

        <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
          {task.goal_id && (
            <p className="flex items-center gap-1.5">
              <Target className="size-3.5" />
              <span>OOS Молочка</span>
            </p>
          )}
          <p>{task.work_type_name} • {task.store_name.split(",")[0]}</p>
          {task.assignee_name ? (
            <p>{task.assignee_name}</p>
          ) : (
            <p className="text-muted-foreground italic">{t("task_card.any_assignee")}</p>
          )}
          <p className="flex items-center gap-1.5 text-warning">
            <Timer className="size-3.5" />
            {t("task_card.expires_in", { time: expiresIn })}
          </p>
        </div>

        {!isReadOnly && task.state !== "COMPLETED" && (
          <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                {t("actions.remove")}
              </Button>
            </AlertDialogTrigger>
            <ConfirmDialog
              title={t("remove_dialog.title")}
              message={t("remove_dialog.description")}
              confirmLabel={t("remove_dialog.confirm")}
              variant="destructive"
              onConfirm={() => {
                onRemove(task.id);
                setRemoveDialogOpen(false);
              }}
              onOpenChange={setRemoveDialogOpen}
            />
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI PROPOSAL CARD
// ═══════════════════════════════════════════════════════════════════

function AIProposalCard({
  task,
  isReadOnly,
  t,
  onPublish,
  onReject,
  onAskAI,
}: {
  task: BonusTask;
  isReadOnly: boolean;
  t: (key: string) => string;
  onPublish: (id: string) => void;
  onReject: (id: string) => void;
  onAskAI: (id: string) => void;
}) {
  const [points, setPoints] = useState(task.bonus_points);
  const [title, setTitle] = useState(task.title);

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1">
            <Sparkles className="size-3" />
            AI
          </Badge>
          <Input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-24 h-8 text-right"
            disabled={isReadOnly}
          />
        </div>

        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3 resize-none"
          rows={2}
          disabled={isReadOnly}
        />

        <div className="text-sm text-muted-foreground mb-3">
          <p>{task.work_type_name} • {task.store_name.split(",")[0]}</p>
        </div>

        <div className="bg-muted/50 rounded-md p-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t("ai_proposals.rationale_title")}
          </p>
          <p className="text-sm text-foreground">{task.description}</p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onPublish(task.id)}
            disabled={isReadOnly}
          >
            {t("actions.publish")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAskAI(task.id)}
          >
            <MessageSquare className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onReject(task.id)}
            disabled={isReadOnly}
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// METRICS TAB
// ═══════════════════════════════════════════════════════════════════

function MetricsTab({
  metrics,
  t,
  locale,
}: {
  metrics: BonusMetrics | null;
  t: (key: string) => string;
  locale: Locale;
}) {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const storeChartData = metrics.by_store.map((s) => {
    const store = MOCK_STORES.find((st) => st.id === s.store_id);
    return {
      name: store?.name?.split(",")[0] || `Store ${s.store_id}`,
      value: s.avg_points_per_user,
    };
  });

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">{t("metrics.distribution_title")}</p>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-2xl font-semibold">{metrics.distribution.top_pct}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-lg">{metrics.distribution.avg_pct}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-lg">{metrics.distribution.low_pct}%</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div
                className="bg-success"
                style={{ width: `${metrics.distribution.top_pct}%` }}
              />
              <div
                className="bg-info"
                style={{ width: `${metrics.distribution.avg_pct}%` }}
              />
              <div
                className="bg-muted"
                style={{ width: `${metrics.distribution.low_pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{t("metrics.distribution_subtitle_top")}</span>
              <span>{t("metrics.distribution_subtitle_avg")}</span>
              <span>{t("metrics.distribution_subtitle_low")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">{t("metrics.best_performers_title")}</p>
            <p className="text-2xl font-semibold mb-2">
              {metrics.top_performers.length} чел.
            </p>
            <div className="flex -space-x-2">
              {metrics.top_performers.slice(0, 3).map((u) => (
                <div
                  key={u.id}
                  className="size-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium border-2 border-background"
                >
                  {u.last_name[0]}{u.first_name[0]}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">{t("metrics.avg_claim_title")}</p>
            <p className="text-2xl font-semibold">
              {metrics.avg_time_to_claim_min} мин
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">{t("metrics.coverage_title")}</p>
            <p className="text-2xl font-semibold">{metrics.coverage_pct}%</p>
            <p className="text-xs text-muted-foreground">{t("metrics.coverage_hint")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("metrics.by_stores_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeChartData} layout="vertical">
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  {storeChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(var(--primary) / ${0.5 + (index * 0.1)})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Honest Curve Alert */}
      {metrics.honest_curve_alert && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{t("metrics.honest_curve_title")}</AlertTitle>
          <AlertDescription>{metrics.honest_curve_alert}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CREATE BONUS TASK DIALOG
// ═══════════════════════════════════════════════════════════════════

function CreateBonusTaskDialog({
  open,
  onOpenChange,
  t,
  tCommon,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
  onSubmit: (data: {
    title: string;
    bonus_source: BonusTaskSource;
    bonus_points: number;
    store_id: number;
    work_type_id: number;
    zone_id: number;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<BonusTaskSource>("SUPERVISOR_BUDGET");
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState(100);
  const [storeId, setStoreId] = useState<string>("");
  const [workTypeId, setWorkTypeId] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  const [afterPlanned, setAfterPlanned] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !storeId || !workTypeId || !zoneId) return;
    setLoading(true);
    try {
      await onSubmit({
        title,
        bonus_source: source,
        bonus_points: points,
        store_id: Number(storeId),
        work_type_id: Number(workTypeId),
        zone_id: Number(zoneId),
      });
      onOpenChange(false);
      // Reset form
      setStep(1);
      setSource("SUPERVISOR_BUDGET");
      setTitle("");
      setPoints(100);
      setStoreId("");
      setWorkTypeId("");
      setZoneId("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("create_dialog.title")}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t("create_dialog.step1_title")}</p>
            <RadioGroup value={source} onValueChange={(v) => setSource(v as BonusTaskSource)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="YESTERDAY_INCOMPLETE" id="source-yesterday" />
                <Label htmlFor="source-yesterday">{t("create_dialog.source_yesterday")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SUPERVISOR_BUDGET" id="source-budget" />
                <Label htmlFor="source-budget">{t("create_dialog.source_budget")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="GOAL_LINKED" id="source-goal" />
                <Label htmlFor="source-goal">{t("create_dialog.source_goal")}</Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>{tCommon("next")}</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{t("create_dialog.step2_title")}</p>

            <div className="space-y-2">
              <Label>{t("create_dialog.name_label")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название задачи"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("create_dialog.work_type_label")}</Label>
                <Select value={workTypeId} onValueChange={setWorkTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_WORK_TYPES.filter((wt) => wt.id < 20).map((wt) => (
                      <SelectItem key={wt.id} value={String(wt.id)}>
                        {wt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("create_dialog.zone_label")}</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_ZONES.filter((z) => z.approved).map((z) => (
                      <SelectItem key={z.id} value={String(z.id)}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("create_dialog.points_label")}</Label>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Магазин</Label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_STORES.filter((s) => !s.archived && s.object_type === "STORE").map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name.split(",")[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("create_dialog.after_planned_label")}</p>
                {afterPlanned && (
                  <p className="text-xs text-muted-foreground">{t("create_dialog.after_planned_hint")}</p>
                )}
              </div>
              <Switch checked={afterPlanned} onCheckedChange={setAfterPlanned} />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                {tCommon("back")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !title || !storeId || !workTypeId || !zoneId}
              >
                {loading ? "..." : t("create_dialog.submit")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function BonusTasks() {
  const t = useTranslations("screen.bonusTasks");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  // State
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [scopeId, setScopeId] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

  // Data
  const [budgets, setBudgets] = useState<BonusBudget[]>([]);
  const [activeTasks, setActiveTasks] = useState<BonusTask[]>([]);
  const [proposals, setProposals] = useState<BonusTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<BonusTask[]>([]);
  const [metrics, setMetrics] = useState<BonusMetrics | null>(null);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [strategies, setStrategies] = useState<StrategiesState>({
    manual: true,
    ai: true,
    yesterday: false,
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [poolDrawerOpen, setPoolDrawerOpen] = useState(false);

  // Mock role for demo (in real app, comes from context)
  const currentRole: FunctionalRole = "SUPERVISOR";
  const isReadOnly = currentRole === "STORE_DIRECTOR";
  const canEditBudget = ["REGIONAL", "NETWORK_OPS"].includes(currentRole);
  const canManageTasks = ["SUPERVISOR", "REGIONAL", "NETWORK_OPS"].includes(currentRole);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch budgets
      const budgetsRes = await getBonusBudgets(
        scopeId !== "all" ? { store_id: Number(scopeId) } : {}
      );
      setBudgets(budgetsRes.data);

      // Fetch active goal
      const goal = MOCK_GOALS.find((g) => g.status === "ACTIVE") ?? null;
      setActiveGoal(goal);

      // Fetch tasks from mock data
      const active = MOCK_BONUS_TASKS.filter((t) => t.state === "ACTIVE");
      const proposed = MOCK_BONUS_TASKS.filter((t) => t.state === "PROPOSED");
      const completed = MOCK_BONUS_TASKS.filter((t) => t.state === "COMPLETED");

      setActiveTasks(active);
      setProposals(proposed);
      setCompletedTasks(completed);

      setLoading(false);

      // Fetch metrics (with delay)
      const metricsRes = await getBonusMetrics({
        store_id: scopeId !== "all" ? Number(scopeId) : undefined,
      });
      setMetrics(metricsRes.data);

      // Fetch AI proposals (with 1.5s delay built in)
      setAiLoading(true);
      await getBonusProposals(goal?.id);
      setAiLoading(false);
    } catch (err) {
      setError(t("toasts.error"));
      setLoading(false);
      setAiLoading(false);
    }
  }, [scopeId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  async function handleCreateTask(data: {
    title: string;
    bonus_source: BonusTaskSource;
    bonus_points: number;
    store_id: number;
    work_type_id: number;
    zone_id: number;
  }) {
    const res = await createBonusTask({
      title: data.title,
      bonus_points: data.bonus_points,
      bonus_source: data.bonus_source,
      store_id: data.store_id,
    });
    if (res.success) {
      toast.success(t("toasts.task_created"));
      fetchData();
    } else {
      toast.error(t("toasts.error"));
    }
  }

  async function handleRemoveTask(id: string) {
    const res = await removeBonusTask(id, "Снято супервайзером");
    if (res.success) {
      toast.success(t("toasts.task_removed"));
      fetchData();
    } else {
      toast.error(t("toasts.error"));
    }
  }

  function handlePublishProposal(id: string) {
    toast.success(t("toasts.proposal_published"));
    setProposals((prev) => prev.filter((p) => p.id !== id));
  }

  function handleRejectProposal(id: string) {
    toast.success(t("toasts.proposal_rejected"));
    setProposals((prev) => prev.filter((p) => p.id !== id));
  }

  function handleAskAI(id: string) {
    // Navigate to AI chat with context
    window.location.href = `${ADMIN_ROUTES.aiChat}?context_type=suggestion&context_id=${id}`;
  }

  function handleToggleStrategy(key: keyof StrategiesState, value: boolean) {
    setStrategies((prev) => ({ ...prev, [key]: value }));
  }

  // Breadcrumbs
  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.goals_bonus"), href: ADMIN_ROUTES.goals },
    { label: t("breadcrumbs.bonus_tasks") },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={isReadOnly ? t("page_subtitle_director") : t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={isReadOnly ? t("page_subtitle_director") : t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{tCommon("error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchData}>
            {tCommon("retry")}
          </Button>
        </Alert>
      </div>
    );
  }

  // Empty state: no budget configured
  if (budgets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={isReadOnly ? t("page_subtitle_director") : t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />
        <EmptyState
          icon={Wallet}
          title={t("empty.no_budget_title")}
          description={t("empty.no_budget_subtitle")}
          action={
            canEditBudget
              ? {
                  label: t("actions.configure_budget"),
                  onClick: () => setBudgetSheetOpen(true),
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page_title")}
        subtitle={isReadOnly ? t("page_subtitle_director") : t("page_subtitle")}
        breadcrumbs={breadcrumbs}
        actions={
          !isReadOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Clock className="size-4 mr-1.5" />
                {t("actions.history")}
              </Button>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="size-4 mr-1.5" />
                <span className="hidden sm:inline">{t("actions.create")}</span>
              </Button>
            </div>
          )
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="today">{t("filters.period_today")}</TabsTrigger>
            <TabsTrigger value="week">{t("filters.period_week")}</TabsTrigger>
            <TabsTrigger value="prev_week">{t("filters.period_prev_week")}</TabsTrigger>
            <TabsTrigger value="custom">{t("filters.period_custom")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={scopeId} onValueChange={setScopeId} disabled={isReadOnly}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={t("filters.scope_label")} />
          </SelectTrigger>
          <SelectContent>
            {MOCK_SCOPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Section 1: Budget, Strategies, Pool, Goal */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BudgetCard
          budgets={budgets}
          isReadOnly={isReadOnly}
          canEditBudget={canEditBudget}
          scopeId={scopeId}
          t={t}
          tCommon={tCommon}
          locale={locale}
          onEditBudget={() => setBudgetSheetOpen(true)}
        />

        <StrategiesCard
          strategies={strategies}
          isReadOnly={isReadOnly}
          t={t}
          onToggle={handleToggleStrategy}
        />

        {strategies.yesterday && (
          <YesterdayPoolCard t={t} onViewPool={() => setPoolDrawerOpen(true)} />
        )}

        {activeGoal && (
          <ActiveGoalCard goal={activeGoal} proposalsCount={proposals.length} t={t} />
        )}
      </div>

      {/* Section 2: Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
          <TabsTrigger value="proposals">
            {t("tabs.ai_proposals")}
            {proposals.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {proposals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">{t("tabs.completed")}</TabsTrigger>
          <TabsTrigger value="metrics">{t("tabs.metrics")}</TabsTrigger>
        </TabsList>

        {/* Active Tab */}
        <TabsContent value="active" className="mt-4">
          {activeTasks.length === 0 ? (
            <EmptyState
              icon={Target}
              title={t("empty.no_active_tasks")}
              description=""
              action={
                canManageTasks
                  ? {
                      label: t("actions.create"),
                      onClick: () => setCreateDialogOpen(true),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeTasks.map((task) => (
                <BonusTaskCard
                  key={task.id}
                  task={task}
                  isReadOnly={isReadOnly}
                  t={t}
                  onRemove={handleRemoveTask}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI Proposals Tab */}
        <TabsContent value="proposals" className="mt-4">
          {aiLoading ? (
            <AILoadingState message="ИИ анализирует..." />
          ) : proposals.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t("empty.no_proposals")}
              description=""
            />
          ) : (
            <div className="space-y-4">
              {activeGoal && (
                <p className="text-sm text-muted-foreground">
                  {t("ai_proposals.section_description").replace("{goal}", activeGoal.title)}
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {proposals.map((task) => (
                  <AIProposalCard
                    key={task.id}
                    task={task}
                    isReadOnly={isReadOnly}
                    t={t}
                    onPublish={handlePublishProposal}
                    onReject={handleRejectProposal}
                    onAskAI={handleAskAI}
                  />
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant="link" asChild>
                  <Link href={`${ADMIN_ROUTES.aiSuggestions}?type=BONUS_TASK_SUGGESTION`}>
                    {t("ai_proposals.all_link")} →
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-4">
          {completedTasks.length === 0 ? (
            <EmptyState
              icon={Check}
              title={t("empty.no_completed")}
              description=""
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("completed_tab.columns.date")}</TableHead>
                    <TableHead>{t("completed_tab.columns.task")}</TableHead>
                    <TableHead>{t("completed_tab.columns.user")}</TableHead>
                    <TableHead>{t("completed_tab.columns.store")}</TableHead>
                    <TableHead className="text-right">{t("completed_tab.columns.points")}</TableHead>
                    <TableHead>{t("completed_tab.columns.source")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(new Date(task.created_at), locale)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{task.title}</TableCell>
                      <TableCell>
                        {task.assignee_name ? (
                          <UserCell
                            user={{
                              first_name: task.assignee_name.split(" ")[1] || "",
                              last_name: task.assignee_name.split(" ")[0] || "",
                            }}
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {task.store_name.split(",")[0]}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        +{task.accepted_points ?? task.bonus_points}
                      </TableCell>
                      <TableCell>
                        <SourceBadge
                          source={task.proposed_by === "AI" ? "GOAL_LINKED" : "SUPERVISOR_BUDGET"}
                          t={t}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="mt-4">
          <MetricsTab metrics={metrics} t={t} locale={locale} />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CreateBonusTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        t={t}
        tCommon={tCommon}
        onSubmit={handleCreateTask}
      />

      {/* Budget Edit Sheet */}
      <Sheet open={budgetSheetOpen} onOpenChange={setBudgetSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("actions.edit_budget")}</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Настройка бюджета часов на бонусные задачи по магазинам.
            </p>
            {MOCK_STORES.filter((s) => !s.archived && s.object_type === "STORE")
              .slice(0, 5)
              .map((store) => (
                <div key={store.id} className="flex items-center justify-between gap-4">
                  <span className="text-sm truncate flex-1">{store.name.split(",")[0]}</span>
                  <Input type="number" defaultValue={40} className="w-20" />
                  <span className="text-sm text-muted-foreground">ч</span>
                </div>
              ))}
            <Button
              className="w-full mt-4"
              onClick={() => {
                toast.success(t("toasts.budget_updated"));
                setBudgetSheetOpen(false);
              }}
            >
              {tCommon("save")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Yesterday Pool Drawer */}
      <Drawer open={poolDrawerOpen} onOpenChange={setPoolDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("yesterday_pool_card.title")}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-3">
            {MOCK_BONUS_TASKS.slice(0, 4).map((task) => (
              <Card key={task.id} className="p-3">
                <p className="font-medium text-sm">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.work_type_name} • +{task.bonus_points} баллов
                </p>
              </Card>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
