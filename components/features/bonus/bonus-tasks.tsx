"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Gift,
  Plus,
  MoreVertical,
  Clock,
  Target,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Link2,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  CircleDot,
  User,
  Coins,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { User as UserModel, BonusBudget } from "@/lib/types";
import type { BonusTaskWithSource, FreelanceLinkInfo, ReplacedByBonusKpi } from "@/lib/api/bonus";

import {
  getBonusBudgets,
  getBonusTasks,
  getBonusProposals,
  getBonusMetrics,
  createBonusTask,
  removeBonusTask,
  getBonusBudgetFreelanceLink,
  getReplacedByBonusKpi,
  getEmployeeBonusPreview,
  updateBonusVisibilitySetting,
} from "@/lib/api/bonus";
import { getUsers } from "@/lib/api/users";
import { MOCK_GOALS } from "@/lib/mock-data/future-placeholders";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type PeriodFilter = "today" | "week" | "prev_week";
type VisibilityMode = "SUMMARY_ONLY" | "ALWAYS_LIST";

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: FreelanceLinkBadge
// ═══════════════════════════════════════════════════════════════════

interface FreelanceLinkBadgeProps {
  budgetId: string;
  locale: string;
}

function FreelanceLinkBadge({ budgetId, locale }: FreelanceLinkBadgeProps) {
  const t = useTranslations("screen.bonusTasks.freelance_link");
  const [info, setInfo] = useState<FreelanceLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBonusBudgetFreelanceLink(budgetId).then((res) => {
      if (!cancelled) {
        setInfo(res.data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [budgetId]);

  if (loading) return <Skeleton className="h-6 w-40" />;
  if (!info) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={ADMIN_ROUTES.freelanceApplicationDetail(info.application_id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-info/15 text-info border border-info/30 px-3 h-7 text-xs font-medium hover:bg-info/25 transition-colors"
            aria-label={t("from_app_badge", { id: info.short_id })}
          >
            <Link2 className="size-3 shrink-0" aria-hidden="true" />
            {t("from_app_badge", { id: info.short_id })}
            <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden="true" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs leading-relaxed">
            {t("tooltip", {
              full: fmt(info.full_cost),
              bonus: fmt(info.bonus_cost),
              saved: fmt(info.saved),
            })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: BonusPoolCard (budget card with optional freelance link)
// ═══════════════════════════════════════════════════════════════════

interface BonusPoolCardProps {
  budget: BonusBudget;
  locale: string;
  storeName?: string;
}

function BonusPoolCard({ budget, locale, storeName }: BonusPoolCardProps) {
  const t = useTranslations("screen.bonusTasks.budget_card");
  const usedPct = budget.total_points > 0
    ? Math.round((budget.spent_points / budget.total_points) * 100)
    : 0;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate">
              {storeName ?? t("title")}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {budget.period_start} — {budget.period_end}
            </span>
          </div>
          <FreelanceLinkBadge budgetId={budget.id} locale={locale} />
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-foreground">
            {budget.total_points.toLocaleString(locale)}
            <span className="text-sm font-normal text-muted-foreground ml-1">₽</span>
          </span>
          <span className={`text-xs font-medium ${usedPct > 80 ? "text-warning" : "text-muted-foreground"}`}>
            {usedPct}% {t("used_label", { value: budget.spent_points.toLocaleString(locale), percent: usedPct })}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
          <div
            className={`h-full rounded-full transition-all ${usedPct > 80 ? "bg-warning" : "bg-primary"}`}
            style={{ width: `${Math.min(usedPct, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: BonusTaskCard (active / AI-proposal task)
// ═══════════════════════════════════════════════════════════════════

interface BonusTaskCardProps {
  task: BonusTaskWithSource;
  isProposal?: boolean;
  onRemove?: (id: string) => void;
  onPublishProposal?: (id: string) => void;
  onRejectProposal?: (id: string) => void;
}

function BonusTaskCard({
  task,
  isProposal,
  onRemove,
  onPublishProposal,
  onRejectProposal,
}: BonusTaskCardProps) {
  const t = useTranslations("screen.bonusTasks");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeReason] = useState("");
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!onRemove) return;
    setRemoving(true);
    const res = await removeBonusTask(task.id, removeReason || "Снято менеджером");
    setRemoving(false);
    if (res.success) {
      toast.success(t("toasts.task_removed"));
      setRemoveOpen(false);
      onRemove(task.id);
    } else {
      toast.error(t("toasts.error"));
    }
  };

  const sourceColors: Record<string, string> = {
    YESTERDAY_INCOMPLETE: "bg-warning/15 text-warning border-warning/30",
    SUPERVISOR_BUDGET: "bg-info/15 text-info border-info/30",
    GOAL_LINKED: "bg-success/15 text-success border-success/30",
  };

  return (
    <Card className="rounded-xl group hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 h-6 text-xs font-medium ${sourceColors[task.bonus_source] ?? "bg-muted text-muted-foreground"}`}
              >
                {t(`completed_tab.source.${task.bonus_source}`)}
              </span>
              {isProposal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 h-6 text-xs font-medium">
                  <Sparkles className="size-3" aria-hidden="true" />
                  AI
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {task.assignee_name ? (
                <span className="flex items-center gap-1">
                  <User className="size-3" aria-hidden="true" />
                  {task.assignee_name}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Users className="size-3" aria-hidden="true" />
                  {t("task_card.any_assignee")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Coins className="size-3" aria-hidden="true" />
                <span className="font-semibold text-foreground">
                  {task.bonus_points} {t("task_card.points_suffix")}
                </span>
              </span>
            </div>
          </div>

          {/* Actions */}
          {isProposal ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs"
                onClick={() => onPublishProposal?.(task.id)}
              >
                {t("actions.publish")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => onRejectProposal?.(task.id)}
              >
                {t("actions.reject")}
              </Button>
            </div>
          ) : (
            <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t("actions.remove")}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <ConfirmDialog
                title={t("remove_dialog.title")}
                message={t("remove_dialog.description")}
                confirmLabel={t("remove_dialog.confirm")}
                variant="destructive"
                onConfirm={handleRemove}
                onOpenChange={setRemoveOpen}
              />
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: EmployeePreviewSection
// ═══════════════════════════════════════════════════════════════════

interface EmployeePreviewSectionProps {
  storeId?: number;
  locale: string;
}

function EmployeePreviewSection({ storeId, locale }: EmployeePreviewSectionProps) {
  const t = useTranslations("screen.bonusTasks.preview");
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [employees, setEmployees] = useState<UserModel[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserModel | null>(null);
  const [preview, setPreview] = useState<{ visible_now_sum: number; available_tasks: BonusTaskWithSource[] } | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (open && employees.length === 0) {
      setLoadingEmployees(true);
      getUsers({ employment_type: "STAFF", page_size: 50, store_id: storeId }).then((res) => {
        setEmployees(res.data.filter((u) => !u.archived));
        setLoadingEmployees(false);
      });
    }
  }, [open, employees.length, storeId]);

  useEffect(() => {
    if (!selectedUser) return;
    setLoadingPreview(true);
    setPreview(null);
    getEmployeeBonusPreview(selectedUser.id, storeId).then((res) => {
      setPreview(res.data);
      setLoadingPreview(false);
    });
  }, [selectedUser, storeId]);

  const fmtRub = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card">
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-xl"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-semibold">{t("section_title")}</span>
          </div>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Employee combobox */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("select_employee_label")}
            </label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full max-w-sm justify-between text-sm h-9"
                >
                  {selectedUser
                    ? `${selectedUser.last_name} ${selectedUser.first_name}`
                    : t("select_employee_placeholder")}
                  <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("select_employee_placeholder")} />
                  <CommandEmpty>
                    {loadingEmployees ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">Загрузка...</div>
                    ) : (
                      "Не найдено"
                    )}
                  </CommandEmpty>
                  <CommandGroup className="max-h-56 overflow-y-auto">
                    {employees.map((emp) => (
                      <CommandItem
                        key={emp.id}
                        value={`${emp.last_name} ${emp.first_name}`}
                        onSelect={() => {
                          setSelectedUser(emp);
                          setComboOpen(false);
                        }}
                      >
                        <span className="truncate">
                          {emp.last_name} {emp.first_name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview cards */}
          {selectedUser && (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Visible now card */}
              <Card className="rounded-lg bg-muted/40 border-dashed">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("visible_now_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {loadingPreview ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-bold text-foreground">
                        {fmtRub(preview?.visible_now_sum ?? 0)}
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("visible_now_hint")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* After planned card */}
              <Card className="rounded-lg bg-success/5 border-success/20">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold text-success/80 uppercase tracking-wide">
                    {t("after_planned_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {loadingPreview ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-3/4" />
                    </div>
                  ) : preview?.available_tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("empty_no_bonuses")}</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {(preview?.available_tasks ?? []).slice(0, 4).map((task) => (
                        <li key={task.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-foreground truncate">{task.title}</span>
                          <span className="text-xs font-semibold text-success shrink-0">
                            {task.bonus_points} ₽
                          </span>
                        </li>
                      ))}
                      {(preview?.available_tasks.length ?? 0) > 4 && (
                        <li className="text-xs text-muted-foreground">
                          +{(preview?.available_tasks.length ?? 0) - 4} ещё...
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: CreateBonusTaskDialog
// ═══════════════════════════════════════════════════════════════════

const createSchema = z.object({
  title: z.string().min(5),
  points: z.number().min(1),
  source: z.enum(["YESTERDAY_INCOMPLETE", "SUPERVISOR_BUDGET", "GOAL_LINKED"]),
});

type CreateFormValues = z.infer<typeof createSchema>;

interface CreateBonusTaskDialogProps {
  storeId?: number;
  onCreated: () => void;
}

function CreateBonusTaskDialog({ storeId, onCreated }: CreateBonusTaskDialogProps) {
  const t = useTranslations("screen.bonusTasks");
  const [open, setOpen] = useState(false);
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", points: 100, source: "SUPERVISOR_BUDGET" },
  });

  const onSubmit = async (values: CreateFormValues) => {
    const res = await createBonusTask({
      title: values.title,
      store_id: storeId ?? 1,
      bonus_points: values.points,
      bonus_source: values.source,
      type: "BONUS",
    });
    if (res.success) {
      toast.success(t("toasts.task_created"));
      form.reset();
      setOpen(false);
      onCreated();
    } else {
      toast.error(t("toasts.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-2">
          <Plus className="size-4" aria-hidden="true" />
          {t("actions.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("create_dialog.title")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create_dialog.name_label")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: Выкладка молочного отдела" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create_dialog.points_label")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create_dialog.step1_title")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      {(["SUPERVISOR_BUDGET", "GOAL_LINKED", "YESTERDAY_INCOMPLETE"] as const).map((src) => (
                        <div key={src} className="flex items-center gap-2">
                          <RadioGroupItem value={src} id={`src-${src}`} />
                          <Label htmlFor={`src-${src}`} className="text-sm cursor-pointer">
                            {t(`create_dialog.source_${src === "SUPERVISOR_BUDGET" ? "budget" : src === "GOAL_LINKED" ? "goal" : "yesterday"}`)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("actions.reject")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t("create_dialog.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENT: SettingsMenu (⋮ dropdown with visibility toggle)
// ═══════════════════════════════════════════════════════════════════

interface SettingsMenuProps {
  visibilityMode: VisibilityMode;
  onVisibilityChange: (mode: VisibilityMode) => void;
}

function SettingsMenu({ visibilityMode, onVisibilityChange }: SettingsMenuProps) {
  const t = useTranslations("screen.bonusTasks.settings_menu");

  const handleToggle = async (mode: VisibilityMode) => {
    onVisibilityChange(mode);
    const res = await updateBonusVisibilitySetting(mode);
    if (!res.success) {
      onVisibilityChange(visibilityMode); // rollback
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Настройки">
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {t("visibility_label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleToggle("SUMMARY_ONLY")}
          className="flex items-center justify-between"
        >
          <span className="text-sm">{t("visibility_summary_only")}</span>
          {visibilityMode === "SUMMARY_ONLY" && (
            <CheckCircle2 className="size-4 text-primary ml-2 shrink-0" aria-hidden="true" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleToggle("ALWAYS_LIST")}
          className="flex items-center justify-between"
        >
          <span className="text-sm">{t("visibility_always")}</span>
          {visibilityMode === "ALWAYS_LIST" && (
            <CheckCircle2 className="size-4 text-primary ml-2 shrink-0" aria-hidden="true" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT: BonusTasks
// ═══════════════════════════════════════════════════════════════════

export function BonusTasks() {
  const t = useTranslations("screen.bonusTasks");
  const tCommon = useTranslations("common");
  const { user } = useAuth();

  const locale = user.preferred_locale ?? "ru";
  const isDirector = user.role === "STORE_DIRECTOR";
  const canCreate = ["SUPERVISOR", "REGIONAL", "NETWORK_OPS"].includes(user.role);
  const storeId = user.stores?.[0]?.id;

  // ── State ────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [tab, setTab] = useState("active");
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("SUMMARY_ONLY");

  // Data states
  const [budgets, setBudgets] = useState<BonusBudget[]>([]);
  const [activeTasks, setActiveTasks] = useState<BonusTaskWithSource[]>([]);
  const [proposals, setProposals] = useState<BonusTaskWithSource[]>([]);
  const [completedTasks, setCompletedTasks] = useState<BonusTaskWithSource[]>([]);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getBonusMetrics>>["data"] | null>(null);
  const [replacedKpi, setReplacedKpi] = useState<ReplacedByBonusKpi | null>(null);
  const [activeGoal] = useState(MOCK_GOALS.find((g) => g.status === "ACTIVE") ?? null);

  // Loading states
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingKpi, setLoadingKpi] = useState(true);

  // Error states
  const [errorActive, setErrorActive] = useState(false);
  const [errorProposals, setErrorProposals] = useState(false);

  // ── Load data ────────────────────────────────────────────────────
  const loadBudgets = useCallback(async () => {
    setLoadingBudgets(true);
    try {
      const res = await getBonusBudgets({ store_id: storeId });
      setBudgets(res.data);
    } finally {
      setLoadingBudgets(false);
    }
  }, [storeId]);

  const loadActive = useCallback(async () => {
    setLoadingActive(true);
    setErrorActive(false);
    try {
      const res = await getBonusTasks({ store_id: storeId, page_size: 20 });
      setActiveTasks(res.data);
    } catch {
      setErrorActive(true);
    } finally {
      setLoadingActive(false);
    }
  }, [storeId]);

  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    setErrorProposals(false);
    try {
      const res = await getBonusProposals(activeGoal?.id);
      setProposals(res.data);
    } catch {
      setErrorProposals(true);
    } finally {
      setLoadingProposals(false);
    }
  }, [activeGoal?.id]);

  const loadCompleted = useCallback(async () => {
    if (completedTasks.length > 0) return;
    setLoadingCompleted(true);
    try {
      const res = await getBonusTasks({ store_id: storeId, status: "COMPLETED", page_size: 20 });
      setCompletedTasks(res.data);
    } finally {
      setLoadingCompleted(false);
    }
  }, [storeId, completedTasks.length]);

  const loadMetrics = useCallback(async () => {
    if (metrics) return;
    setLoadingMetrics(true);
    try {
      const res = await getBonusMetrics({ store_id: storeId });
      setMetrics(res.data);
    } finally {
      setLoadingMetrics(false);
    }
  }, [storeId, metrics]);

  const loadKpi = useCallback(async () => {
    setLoadingKpi(true);
    try {
      const res = await getReplacedByBonusKpi({ store_id: storeId });
      setReplacedKpi(res.data);
    } finally {
      setLoadingKpi(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadBudgets();
    loadActive();
    loadProposals();
    loadKpi();
  }, [loadBudgets, loadActive, loadProposals, loadKpi]);

  useEffect(() => {
    if (tab === "completed") loadCompleted();
    if (tab === "metrics") loadMetrics();
  }, [tab, loadCompleted, loadMetrics]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleRemoveTask = useCallback((id: string) => {
    setActiveTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handlePublishProposal = useCallback((id: string) => {
    const task = proposals.find((t) => t.id === id);
    if (task) {
      setActiveTasks((prev) => [task, ...prev]);
      setProposals((prev) => prev.filter((t) => t.id !== id));
      toast.success(t("toasts.proposal_published"));
    }
  }, [proposals, t]);

  const handleRejectProposal = useCallback((id: string) => {
    setProposals((prev) => prev.filter((t) => t.id !== id));
    toast.success(t("toasts.proposal_rejected"));
  }, [t]);

  const fmtRub = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);

  // ── Breadcrumbs ──────────────────────────────────────────────────
  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.goals_bonus"), href: ADMIN_ROUTES.goals },
    { label: t("breadcrumbs.bonus_tasks") },
  ];

  // ── KPI row (from replaced freelance) ────────────────────────────
  const replacedHoursLabel = replacedKpi
    ? `${replacedKpi.total_hours}ч`
    : "—";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title={t("page_title")}
        subtitle={isDirector ? t("page_subtitle_director") : t("page_subtitle")}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <CreateBonusTaskDialog storeId={storeId} onCreated={loadActive} />
            )}
            <SettingsMenu
              visibilityMode={visibilityMode}
              onVisibilityChange={setVisibilityMode}
            />
          </div>
        }
      />

      {/* Period filter chips */}
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Период">
        {(["today", "week", "prev_week"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`inline-flex items-center rounded-full border px-3 h-8 text-xs font-medium transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {t(`filters.period_${p}`)}
          </button>
        ))}
        {period !== "today" && (
          <button
            onClick={() => setPeriod("today")}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {tCommon("clear_all")}
          </button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Активных задач"
          value={loadingActive ? "—" : activeTasks.length}
          icon={Gift}
        />
        <KpiCard
          label="Предложений ИИ"
          value={loadingProposals ? "—" : proposals.length}
          icon={Sparkles}
        />
        {/* Replaced by bonus KPI */}
        {loadingKpi ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : replacedKpi && replacedKpi.replaced_count > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <KpiCard
                    label={t("freelance_link.kpi_replaced_title")}
                    value={t("freelance_link.kpi_replaced_value", {
                      hours: replacedHoursLabel,
                      saved: fmtRub(replacedKpi.total_saved),
                    })}
                    icon={TrendingUp}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">
                  {replacedKpi.replaced_count} заявок на внештат заменено бонусным пулом
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <KpiCard
            label="Бюджет использован"
            value={
              budgets.length > 0
                ? `${Math.round((budgets.reduce((s, b) => s + b.spent_points, 0) / Math.max(budgets.reduce((s, b) => s + b.total_points, 0), 1)) * 100)}%`
                : "—"
            }
            icon={BarChart3}
          />
        )}
        <KpiCard
          label="Стратегий активно"
          value="3"
          icon={Target}
        />
      </div>

      {/* Budget pools */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("budget_card.title")}
        </h2>
        {loadingBudgets ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <EmptyState
            icon={Gift}
            title={t("empty.no_budget_title")}
            description={t("empty.no_budget_subtitle")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => {
              const store = user.stores?.find((s) => s.id === budget.store_id);
              return (
                <BonusPoolCard
                  key={budget.id}
                  budget={budget}
                  locale={locale}
                  storeName={store?.name}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Active goal card */}
      {activeGoal && (
        <Card className="rounded-xl bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 shrink-0">
                <Target className="size-5 text-primary" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("active_goal_card.title")}
                  </span>
                  <Badge variant="secondary" className="text-xs h-5 bg-primary/10 text-primary border-primary/20">
                    <Sparkles className="size-3 mr-1" aria-hidden="true" />
                    {t("active_goal_card.ai_badge")}
                  </Badge>
                </div>
                <span className="text-sm font-semibold text-foreground truncate">
                  {activeGoal.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("active_goal_card.proposals_count", { count: proposals.length })}
                </span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 shrink-0">
              <Link href={ADMIN_ROUTES.goals}>
                {t("actions.open_goal")}
                <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="active" className="text-xs">
            {t("tabs.active")}
            {activeTasks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-xs font-semibold">
                {activeTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai_proposals" className="text-xs">
            {t("tabs.ai_proposals")}
            {proposals.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-xs font-semibold">
                {proposals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            {t("tabs.completed")}
          </TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs">
            {t("tabs.metrics")}
          </TabsTrigger>
        </TabsList>

        {/* Active tab */}
        <TabsContent value="active" className="mt-4">
          {errorActive ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Ошибка загрузки</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                Не удалось загрузить активные задачи.
                <Button size="sm" variant="outline" className="h-7 text-xs ml-2" onClick={loadActive}>
                  <RefreshCw className="size-3 mr-1" aria-hidden="true" />
                  {tCommon("retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : loadingActive ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : activeTasks.length === 0 ? (
            <EmptyState
              icon={Gift}
              title={t("empty.no_active_tasks")}
              description="Создайте первую бонусную задачу или дождитесь предложений ИИ"
              action={canCreate ? { label: t("actions.create"), onClick: () => {} } : undefined}
            />
          ) : (
            <div className="grid gap-3">
              {activeTasks.map((task) => (
                <BonusTaskCard
                  key={task.id}
                  task={task}
                  onRemove={canCreate ? handleRemoveTask : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI Proposals tab */}
        <TabsContent value="ai_proposals" className="mt-4">
          {activeGoal && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {t("ai_proposals.section_description", { goal: activeGoal.title })}
            </p>
          )}
          {errorProposals ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Ошибка загрузки</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                Не удалось загрузить предложения ИИ.
                <Button size="sm" variant="outline" className="h-7 text-xs ml-2" onClick={loadProposals}>
                  <RefreshCw className="size-3 mr-1" aria-hidden="true" />
                  {tCommon("retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : loadingProposals ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : proposals.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={t("empty.no_proposals")}
              description="ИИ анализирует данные и предложит задачи на основе активной цели"
            />
          ) : (
            <div className="grid gap-3">
              {proposals.map((task) => (
                <BonusTaskCard
                  key={task.id}
                  task={task}
                  isProposal
                  onPublishProposal={canCreate ? handlePublishProposal : undefined}
                  onRejectProposal={canCreate ? handleRejectProposal : undefined}
                />
              ))}
              <div className="text-center pt-2">
                <Button asChild variant="link" size="sm" className="text-xs text-muted-foreground">
                  <Link href={ADMIN_ROUTES.aiSuggestions}>
                    {t("ai_proposals.all_link")}
                    <ArrowRight className="size-3 ml-1" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Completed tab */}
        <TabsContent value="completed" className="mt-4">
          {loadingCompleted ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : completedTasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={t("empty.no_completed")}
              description="Завершённые бонусные задачи появятся здесь"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                      {t("completed_tab.columns.task")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                      {t("completed_tab.columns.user")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                      {t("completed_tab.columns.source")}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">
                      {t("completed_tab.columns.points")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completedTasks.map((task, idx) => (
                    <tr
                      key={task.id}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground line-clamp-1">{task.title}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {task.assignee_name ?? t("task_card.any_assignee")}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 h-5 text-xs text-muted-foreground">
                          {t(`completed_tab.source.${task.bonus_source}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {task.bonus_points} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Metrics tab */}
        <TabsContent value="metrics" className="mt-4">
          {loadingMetrics ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : !metrics ? (
            <EmptyState
              icon={BarChart3}
              title="Нет данных"
              description="Метрики появятся после первых выполненных бонусных задач"
            />
          ) : (
            <div className="flex flex-col gap-6">
              {metrics.honest_curve_alert && (
                <Alert>
                  <AlertCircle className="size-4" />
                  <AlertDescription className="text-sm">
                    {metrics.honest_curve_alert}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label={t("metrics.coverage_title")}
                  value={`${metrics.coverage_pct}%`}
                  icon={CircleDot}
                />
                <KpiCard
                  label={t("metrics.avg_claim_title")}
                  value={`${metrics.avg_time_to_claim_min} мин`}
                  icon={Clock}
                />
                <KpiCard
                  label={t("metrics.distribution_subtitle_top")}
                  value={`${metrics.distribution.top_pct}%`}
                  icon={TrendingUp}
                  diff={2}
                />
                <KpiCard
                  label="Средний % от ЗП"
                  value={`+${metrics.distribution.avg_pct}%`}
                  icon={Coins}
                />
              </div>

              {/* Top performers */}
              <Card className="rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {t("metrics.best_performers_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col divide-y">
                    {metrics.top_performers.map((user, idx) => (
                      <li key={user.id} className="flex items-center justify-between py-2.5 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {user.last_name} {user.first_name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-primary shrink-0">
                          +{idx === 0 ? 15 : idx === 1 ? 12 : 10}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Employee mobile preview section */}
      <EmployeePreviewSection storeId={storeId} locale={locale} />
    </div>
  );
}
