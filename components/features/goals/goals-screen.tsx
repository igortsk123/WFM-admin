"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Sparkles,
  Clock,
  Target,
  TrendingDown,
  Calendar,
  Package,
  Tag,
  Zap,
  Gauge,
  Plus,
  ArrowRight,
  MessageSquare,
  Gift,
  ChevronRight,
  ShoppingCart,
  Shirt,
  Factory,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { PageHeader, EmptyState, ConfirmDialog } from "@/components/shared";
import type { Goal, GoalCategory, FunctionalRole, User, Locale } from "@/lib/types";
import { 
  getGoals, 
  getGoalProposals, 
  selectGoal, 
  removeGoal, 
  createManualGoal,
  getGoalProgress,
  type GoalProposal,
  type GoalProgress,
} from "@/lib/api/goals";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface GoalWithUser extends Goal {
  selected_by_user?: Pick<User, "id" | "first_name" | "last_name">;
}

type PeriodFilter = "current" | "next" | "previous";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const CATEGORY_ICONS: Record<GoalCategory, typeof Target> = {
  OOS_REDUCTION: Package,
  WRITE_OFFS: TrendingDown,
  PROMO_QUALITY: Tag,
  PRICE_ACCURACY: Target,
  IMPULSE_ZONES: Zap,
  PRODUCTIVITY: Gauge,
  CUSTOM: Sparkles,
};

// Fake sparkline data for demo
const SPARKLINE_DATA = [
  { v: 7.2 }, { v: 6.8 }, { v: 7.0 }, { v: 6.5 }, { v: 6.2 }, { v: 5.9 }, { v: 5.9 },
];

// Goal Catalog content
const CATALOG_GOALS = {
  fmcg: [
    {
      title: "Снизить OOS по топ-SKU",
      when: "Пустые полки при нормальных поставках",
      period: "4 нед",
      tasks: ["Обход полки", "Вынос со склада", "Пересчёт"],
      aiSource: "POS + Остатки",
    },
    {
      title: "Снизить списания и просрочку",
      when: "Списания выше нормы категории",
      period: "4-6 нед",
      tasks: ["Ротация FIFO", "Уценка к порогу", "Контроль скоропорта"],
      aiSource: "POS + Остатки + сроки годности",
    },
    {
      title: "Качество промо-исполнения",
      when: "Промо не выставляется вовремя",
      period: "2-3 нед",
      tasks: ["Контроль старта промо", "Выкладка к 10:00"],
      aiSource: "Промо + Остатки",
    },
    {
      title: "Точность ценников",
      when: "Жалобы на кассе на расхождения",
      period: "4 нед",
      tasks: ["Обход ценников после переоценки"],
      aiSource: "Промо",
    },
    {
      title: "Импульсные зоны",
      when: "Низкий средний чек",
      period: "4 нед",
      tasks: ["Выкладка по планограмме"],
      aiSource: "POS — анализ среднего чека",
    },
    {
      title: "Производительность смены",
      when: "Много невыполненных задач",
      period: "4-8 нед",
      tasks: ["Скоростные задачи", "Маршруты обхода"],
      aiSource: "Внутренняя телеметрия задач",
    },
  ],
  fashion: [
    {
      title: "Снизить остатки сезонной коллекции",
      when: "Коллекция залежалась более 60 дней",
      period: "6-8 нед",
      tasks: ["Уценить", "Выставить в маркетинг-канал"],
      aiSource: "Дата заведения карточки + продажи",
    },
    {
      title: "Увеличить продажи трикотажа",
      when: "Категория отстаёт от плана",
      period: "4 нед",
      tasks: ["Выкладка фронтально", "Замена стикеров"],
      aiSource: "POS по категориям",
    },
    {
      title: "Снизить возвраты после примерки",
      when: "Высокий % возвратов",
      period: "4 нед",
      tasks: ["Чек-листы примерки"],
      aiSource: "POS + возвраты",
    },
    {
      title: "Скорость ротации витрины",
      when: "Витрина не обновлялась более 7 дней",
      period: "2 нед",
      tasks: ["Обновление витрины 2x в неделю"],
      aiSource: "Внутренние данные",
    },
  ],
  production: [
    {
      title: "Снизить долю брака на участке",
      when: "Брак выше нормы участка",
      period: "6-8 нед",
      tasks: ["Контроль качества", "Обучение"],
      aiSource: "Статистика операций цеха",
    },
    {
      title: "Сократить хвосты в конце смены",
      when: "Много незавершённых заказов",
      period: "4 нед",
      tasks: ["Перераспределение заказов"],
      aiSource: "Внутренняя телеметрия",
    },
    {
      title: "Соответствие срокам отгрузки",
      when: "Срывы сроков",
      period: "4 нед",
      tasks: ["Приоритизация заказов"],
      aiSource: "План отгрузок",
    },
  ],
};

// Mock stores for scope filter
const MOCK_SCOPE_OPTIONS = [
  { id: "network", name: "Вся сеть" },
  { id: "1", name: "СПАР Томск, пр. Ленина 80" },
  { id: "7", name: "Food City Томск Global Market" },
  { id: "4", name: "СПАР Новосибирск, ул. Ленина 55" },
];

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function CategoryBadge({ category, t }: { category: GoalCategory; t: (key: string) => string }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className="size-3" />
      {t(`category.${category}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Active goal skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposals skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </CardContent>
      </Card>
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

// ═══════════════════════════════════════════════════════════════════
// SELECT GOAL DIALOG CONTENT
// ═══════════════════════════════════════════════════════════════════

function SelectGoalDialogContent({
  goal,
  hasActiveGoal,
  t,
  tCommon,
  onConfirm,
  onOpenChange,
}: {
  goal: GoalProposal;
  hasActiveGoal: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  tCommon: (key: string) => string;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfirmDialog
      title={t("proposals.select_confirm_title", { title: goal.title })}
      message={hasActiveGoal ? t("proposals.select_confirm_replace_warning") : ""}
      confirmLabel={loading ? "..." : t("proposals.select_confirm_button")}
      cancelLabel={tCommon("cancel")}
      variant="default"
      onConfirm={handleConfirm}
      onOpenChange={onOpenChange}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// REMOVE GOAL DIALOG CONTENT
// ═══════════════════════════════════════════════════════════════════

function RemoveGoalDialogContent({
  t,
  tCommon,
  onConfirm,
  onOpenChange,
}: {
  t: (key: string) => string;
  tCommon: (key: string) => string;
  onConfirm: (reason: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm(reason || "Без комментария");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfirmDialog
      title={t("remove_dialog.title")}
      message={t("remove_dialog.description")}
      confirmLabel={loading ? "..." : t("remove_dialog.confirm")}
      cancelLabel={tCommon("cancel")}
      variant="destructive"
      onConfirm={handleConfirm}
      onOpenChange={onOpenChange}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// CREATE GOAL DIALOG CONTENT
// ═══════════════════════════════════════════════════════════════════

function CreateGoalDialogContent({
  t,
  tCommon,
  onSubmit,
  onOpenChange,
}: {
  t: (key: string) => string;
  tCommon: (key: string) => string;
  onSubmit: (data: Partial<Goal>) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<GoalCategory>("CUSTOM");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        title,
        description,
        category,
        target_value: parseFloat(targetValue) || 0,
        target_unit: targetUnit,
        period_start: periodStart,
        period_end: periodEnd,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const categories: GoalCategory[] = [
    "OOS_REDUCTION",
    "WRITE_OFFS",
    "PROMO_QUALITY",
    "PRICE_ACCURACY",
    "IMPULSE_ZONES",
    "PRODUCTIVITY",
    "CUSTOM",
  ];

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t("manual_create.dialog_title")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t("manual_create.title_label")}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t("manual_create.description_label")}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">{t("manual_create.category_label")}</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`category.${cat}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetValue">{t("manual_create.target_value_label")}</Label>
            <Input
              id="targetValue"
              type="number"
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetUnit">{t("manual_create.target_unit_label")}</Label>
            <Input
              id="targetUnit"
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              placeholder="%"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="periodStart">{t("manual_create.period_start_label")}</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodEnd">{t("manual_create.period_end_label")}</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? "..." : t("manual_create.submit")}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HISTORY DRAWER CONTENT
// ═══════════════════════════════════════════════════════════════════

function HistoryDrawerContent({
  goals,
  locale,
  t,
}: {
  goals: GoalWithUser[];
  locale: Locale;
  t: (key: string) => string;
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
                {goal.status === "COMPLETED" ? "Достигнута" : "Архив"}
              </Badge>
            </div>
            <p className="font-medium text-sm">{goal.title}</p>
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

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GoalsScreen() {
  const t = useTranslations("screen.goals");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  // State
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("current");
  const [scopeId, setScopeId] = useState("network");
  const [scopeOpen, setScopeOpen] = useState(false);

  // Data
  const [activeGoal, setActiveGoal] = useState<GoalWithUser | null>(null);
  const [proposals, setProposals] = useState<GoalProposal[]>([]);
  const [allGoals, setAllGoals] = useState<GoalWithUser[]>([]);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);

  // Dialog states
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<GoalProposal | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Mock role for demo (in real app, comes from context)
  const currentRole: FunctionalRole = "SUPERVISOR";
  const canManageGoals = ["SUPERVISOR", "REGIONAL", "NETWORK_OPS"].includes(currentRole);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all goals
      const goalsRes = await getGoals({
        store_id: scopeId !== "network" ? parseInt(scopeId) : undefined,
      });
      setAllGoals(goalsRes.data);

      // Find active goal
      const active = goalsRes.data.find((g) => g.status === "ACTIVE") ?? null;
      setActiveGoal(active);

      // Fetch progress for active goal
      if (active) {
        const progressRes = await getGoalProgress(active.id);
        setGoalProgress(progressRes.data);
      } else {
        setGoalProgress(null);
      }

      setLoading(false);

      // Fetch AI proposals (with 1.5s delay built in)
      setAiLoading(true);
      const proposalsRes = await getGoalProposals({
        store_id: scopeId !== "network" ? parseInt(scopeId) : undefined,
      });
      setProposals(proposalsRes.data);
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
  async function handleSelectGoal(proposal: GoalProposal) {
    try {
      await selectGoal(proposal.id);
      toast.success(t("toasts.selected"));
      setSelectDialogOpen(false);
      setSelectedProposal(null);
      fetchData();
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  async function handleRemoveGoal(reason: string) {
    if (!activeGoal) return;
    try {
      await removeGoal(activeGoal.id, reason);
      toast.success(t("toasts.removed"));
      setRemoveDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  async function handleCreateGoal(data: Partial<Goal>) {
    try {
      await createManualGoal(data);
      toast.success(t("toasts.created"));
      setCreateDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t("toasts.error"));
    }
  }

  // Period label
  function getPeriodLabel(p: PeriodFilter): string {
    const now = new Date("2026-05-01");
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);

    if (p === "current") {
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${t("filters.current_week")} (${formatDate(startOfWeek, locale)} – ${formatDate(endOfWeek, locale)})`;
    }
    if (p === "next") return t("filters.next_week");
    return t("filters.previous_week");
  }

  // Breadcrumbs
  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.goals") },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
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
          subtitle={t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchData}>
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={breadcrumbs}
        />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sticky top-0 z-10 bg-background py-2 -mt-2">
          {/* Period filter */}
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-full sm:w-auto min-w-[260px]">
              <Calendar className="size-4 mr-2 text-muted-foreground" />
              <SelectValue>{getPeriodLabel(period)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">{getPeriodLabel("current")}</SelectItem>
              <SelectItem value="next">{t("filters.next_week")}</SelectItem>
              <SelectItem value="previous">{t("filters.previous_week")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Scope filter */}
          <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto min-w-[200px] justify-start">
                <Target className="size-4 mr-2 text-muted-foreground" />
                {MOCK_SCOPE_OPTIONS.find((o) => o.id === scopeId)?.name ?? t("filters.scope_label")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" align="start">
              <Command>
                <CommandInput placeholder={t("filters.scope_label")} />
                <CommandList>
                  <CommandEmpty>{t("empty.no_data_title")}</CommandEmpty>
                  <CommandGroup>
                    {MOCK_SCOPE_OPTIONS.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.name}
                        onSelect={() => {
                          setScopeId(option.id);
                          setScopeOpen(false);
                        }}
                      >
                        {option.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* History drawer */}
          <div className="flex-1 sm:flex-none sm:ml-auto">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Clock className="size-4 mr-2" />
                  {t("actions.history")}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>{t("actions.history")}</DrawerTitle>
                </DrawerHeader>
                <HistoryDrawerContent goals={allGoals} locale={locale} t={t} />
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {/* Section 1: Active Goal Banner */}
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
                        onConfirm={handleRemoveGoal}
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

        {/* Section 2: AI Proposals */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  {t("proposals.section_title")}
                </CardTitle>
                {!aiLoading && proposals.length > 0 && (
                  <CardDescription className="mt-1">
                    {t("proposals.section_subtitle_count", { count: proposals.length })}
                  </CardDescription>
                )}
              </div>
              <Button variant="link" size="sm" asChild className="p-0 h-auto">
                <Link href={`${ADMIN_ROUTES.aiSuggestions}?type=GOAL_SUGGESTION`}>
                  {t("actions.all_ai_suggestions")}
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <AILoadingState message={t("ai_loading")} />
            ) : proposals.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title={t("empty.no_proposals_title")}
                description={t("empty.no_proposals_subtitle")}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proposals.map((proposal) => {
                  const Icon = CATEGORY_ICONS[proposal.category];
                  return (
                    <Card key={proposal.id} className="flex flex-col">
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                              <Icon className="size-4 text-muted-foreground" />
                            </span>
                            <CategoryBadge category={proposal.category} t={t} />
                          </div>
                          <Badge variant="outline">
                            {t("priority.high" as Parameters<typeof t>[0])}
                          </Badge>
                        </div>

                        <h3 className="font-semibold text-sm mb-2 text-balance">{proposal.title}</h3>
                        <p className="text-xs text-muted-foreground mb-4 flex-1 leading-relaxed">
                          {proposal.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div className="bg-muted rounded-md p-2">
                            <p className="text-muted-foreground">{t("proposals.current_value")}</p>
                            <p className="font-medium">
                              {proposal.current_value}
                              {proposal.target_unit}
                            </p>
                          </div>
                          <div className="bg-muted rounded-md p-2">
                            <p className="text-muted-foreground">{t("proposals.target_value")}</p>
                            <p className="font-medium">
                              {proposal.target_value}
                              {proposal.target_unit}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-success font-medium mb-4">
                          {t("proposals.potential_gain")}: {proposal.potential_value}
                        </div>

                        <div className="flex gap-2 mt-auto">
                          {canManageGoals ? (
                            <AlertDialog
                              open={selectDialogOpen && selectedProposal?.id === proposal.id}
                              onOpenChange={(open) => {
                                setSelectDialogOpen(open);
                                if (!open) setSelectedProposal(null);
                              }}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setSelectedProposal(proposal)}
                                >
                                  {t("actions.select_as_active")}
                                </Button>
                              </AlertDialogTrigger>
                              {selectedProposal && (
                                <SelectGoalDialogContent
                                  goal={selectedProposal}
                                  hasActiveGoal={!!activeGoal}
                                  t={t}
                                  tCommon={tCommon}
                                  onConfirm={() => handleSelectGoal(selectedProposal)}
                                  onOpenChange={(open) => {
                                    setSelectDialogOpen(open);
                                    if (!open) setSelectedProposal(null);
                                  }}
                                />
                              )}
                            </AlertDialog>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" className="flex-1" disabled>
                                  {t("actions.select_as_active")}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Решение принимает супервайзер или директор сети
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`${ADMIN_ROUTES.aiChat}?context_type=suggestion&context_id=${proposal.id}`}>
                              <MessageSquare className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Progress Dashboard (only if active goal) */}
        {activeGoal && goalProgress && (
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
                      value={
                        ((activeGoal.target_value - goalProgress.current_value) /
                          (activeGoal.target_value - activeGoal.current_value)) *
                        100
                      }
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
        )}

        {/* Section 4: Goal Catalog */}
        <Card>
          <CardHeader>
            <CardTitle>{t("catalog.section_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="fmcg" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="fmcg" className="gap-1.5">
                  <ShoppingCart className="size-4" />
                  {t("catalog.tab_fmcg")}
                </TabsTrigger>
                <TabsTrigger value="fashion" className="gap-1.5">
                  <Shirt className="size-4" />
                  {t("catalog.tab_fashion")}
                </TabsTrigger>
                <TabsTrigger value="production" className="gap-1.5">
                  <Factory className="size-4" />
                  {t("catalog.tab_production")}
                </TabsTrigger>
              </TabsList>

              {(["fmcg", "fashion", "production"] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CATALOG_GOALS[tab].map((goal, i) => (
                      <Card key={i} className="flex flex-col">
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <h4 className="font-medium text-sm mb-2">{goal.title}</h4>

                          <div className="space-y-2 text-xs flex-1">
                            <div>
                              <span className="text-muted-foreground">{t("catalog.when_to_use")}: </span>
                              <span>{goal.when}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("catalog.typical_period")}: </span>
                              <span>{goal.period}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("catalog.key_tasks")}: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {goal.tasks.map((task, j) => (
                                  <Badge key={j} variant="secondary" className="text-xs">
                                    {task}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t("catalog.ai_analyzes_via")}: </span>
                              <span>{goal.aiSource}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                {t("catalog.footer_hint")}{" "}
                <Link href={ADMIN_ROUTES.integrations} className="text-primary hover:underline">
                  {t("actions.connect_data_sources")}
                  <ChevronRight className="size-3 inline" />
                </Link>
              </p>

              {canManageGoals ? (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="size-4 mr-1" />
                      {t("actions.create_manual_goal")}
                    </Button>
                  </DialogTrigger>
                  <CreateGoalDialogContent
                    t={t}
                    tCommon={tCommon}
                    onSubmit={handleCreateGoal}
                    onOpenChange={setCreateDialogOpen}
                  />
                </Dialog>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button disabled>
                      <Plus className="size-4 mr-1" />
                      {t("actions.create_manual_goal")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Решение принимает супервайзер или директор сети
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
