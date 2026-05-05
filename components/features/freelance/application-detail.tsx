"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Info,
  Link2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  RefreshCw,
  ListChecks,
  ExternalLink,
} from "lucide-react";

import {
  getFreelanceApplicationById,
  simulateApplicationApproval,
  approveApplicationFull,
  approveApplicationPartial,
  rejectApplication,
  replaceWithBonus,
  approveMixed,
} from "@/lib/api/freelance-applications";
import {
  getAssignmentsByApplication,
  createAssignment,
  removeAssignment,
} from "@/lib/api/freelance-assignments";
import { getAgents } from "@/lib/api/freelance-agents";

import type {
  FreelanceApplication,
  BudgetUsage,
  FreelancerAssignment,
  Agent,
} from "@/lib/types";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  PageHeader,
  ApplicationStatusBadge,
  WorkTypeBadge,
  RoleBadge,
  EmptyState,
} from "@/components/shared";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatDate, formatRelative } from "@/lib/utils/format";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type DecisionVariant =
  | "FULL"
  | "PARTIAL"
  | "REJECT"
  | "BONUS"
  | "MIXED"
  | null;

interface SimulationResult {
  cost: number;
  currency: string;
  after_approval: BudgetUsage;
  blocked: boolean;
  blocked_reason?: string;
}

interface ApplicationDetailData extends FreelanceApplication {
  budget_usage: BudgetUsage[];
  simulated_cost: number;
  history: Array<{
    occurred_at: string;
    actor_id: number;
    actor_name: string;
    action: string;
    comment?: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function shortId(id: string): string {
  return id.replace(/^app-/, "").toUpperCase();
}

function budgetPct(actual: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((actual / limit) * 100));
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════

function ApplicationDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex flex-col gap-4 min-w-0 flex-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <div className="lg:w-80 lg:shrink-0 flex flex-col gap-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BUDGET BAR ROW
// ═══════════════════════════════════════════════════════════════════

function BudgetUsageRow({
  usage,
  periodLabel,
  simulatedActual,
}: {
  usage: BudgetUsage;
  periodLabel: string;
  simulatedActual?: number;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.finance_card");

  const displayActual = simulatedActual ?? usage.actual_amount;
  const pct = budgetPct(displayActual, usage.limit_amount);
  const overspend = Math.max(0, displayActual - usage.limit_amount);

  // Map semantic state to CSS var color for the indicator
  const isOverspend = displayActual > usage.limit_amount;
  const isRisk = !isOverspend && pct > 80;
  const indicatorColor = isOverspend
    ? "var(--color-destructive)"
    : isRisk
    ? "var(--color-warning)"
    : "var(--color-success)";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground capitalize">
          {periodLabel}
        </span>
        <span className="text-muted-foreground">
          {displayActual.toLocaleString("ru")} /{" "}
          {usage.limit_amount.toLocaleString("ru")} {usage.currency === "RUB" ? "₽" : usage.currency}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, pct)}%`,
            backgroundColor: indicatorColor,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("budget_planned")}: {usage.planned_amount.toLocaleString("ru")} {usage.currency === "RUB" ? "₽" : usage.currency}
        </span>
        {overspend > 0 && (
          <span className="text-destructive font-medium">
            {t("budget_overspend")}: +{overspend.toLocaleString("ru")} {usage.currency === "RUB" ? "₽" : usage.currency}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ASSIGNMENT ROW
// ═══════════════════════════════════════════════════════════════════

function AssignmentRow({
  assignment,
  onRemove,
}: {
  assignment: FreelancerAssignment;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.assignment_card");

  const statusKey = `assignment_status_${assignment.status}` as Parameters<typeof t>[0];

  const statusClass: Record<FreelancerAssignment["status"], string> = {
    SCHEDULED: "bg-info/10 text-info",
    CHECKED_IN: "bg-warning/10 text-warning",
    WORKING: "bg-warning/10 text-warning",
    DONE: "bg-success/10 text-success",
    NO_SHOW: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {assignment.freelancer_name}
        </span>
        <span className="text-xs text-muted-foreground">
          {assignment.freelancer_phone}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${statusClass[assignment.status]}`}
        >
          {t(statusKey)}
        </span>
        {assignment.status === "SCHEDULED" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(assignment.id)}
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">{t("remove_assignment")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ASSIGN SHEET
// ═══════════════════════════════════════════════════════════════════

function AssignSheet({
  open,
  onOpenChange,
  applicationId,
  paymentMode,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: string;
  paymentMode?: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.assignment_card");
  const [phone, setPhone] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && paymentMode !== "CLIENT_DIRECT") {
      getAgents({ page_size: 50 })
        .then((r) => setAgents(r.data))
        .catch(() => {});
    }
  }, [open, paymentMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !scheduledStart || !scheduledEnd) return;
    setSubmitting(true);
    try {
      const res = await createAssignment(applicationId, {
        freelancer_phone: phone,
        agent_id: agentId || null,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
      });
      if (res.success) {
        toast.success(t("sheet_submit"));
        onOpenChange(false);
        onSuccess();
        setPhone("");
        setAgentId("");
        setScheduledStart("");
        setScheduledEnd("");
      } else {
        toast.error(res.error?.message ?? t("sheet_cancel"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showNewHint = phone.length >= 10 && !phone.startsWith("+7");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("sheet_title")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("sheet_title")}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-phone">{t("sheet_phone_label")}</Label>
            <Input
              id="assign-phone"
              type="tel"
              placeholder={t("sheet_phone_placeholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {showNewHint && (
              <p className="text-xs text-muted-foreground">
                {t("sheet_phone_not_found")}
              </p>
            )}
          </div>

          {paymentMode !== "CLIENT_DIRECT" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-agent">
                {t("sheet_agent_label")}{" "}
                <span className="text-muted-foreground text-xs">
                  ({t("sheet_agent_optional")})
                </span>
              </Label>
              <select
                id="assign-agent"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t("sheet_agent_placeholder")}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-start">{t("sheet_start_label")}</Label>
            <Input
              id="assign-start"
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-end">{t("sheet_end_label")}</Label>
            <Input
              id="assign-end"
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              required
            />
          </div>

          <SheetFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("sheet_cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !phone || !scheduledStart || !scheduledEnd}>
              {t("sheet_submit")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DECISION SIDEBAR
// ═══════════════════════════════════════════════════════════════════

function DecisionSidebar({
  app,
  simulation,
  simulatedHours,
  onRefresh,
}: {
  app: ApplicationDetailData;
  simulation: SimulationResult | null;
  simulatedHours: number;
  onRefresh: () => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.decision_card");
  const router = useRouter();

  const [variant, setVariant] = useState<DecisionVariant>(null);
  const [partialHours, setPartialHours] = useState(app.requested_hours - 0.5);
  const [rejectReason, setRejectReason] = useState("");
  const [mixedFreelance, setMixedFreelance] = useState(
    Math.ceil(app.requested_hours / 2)
  );
  const [mixedBonus, setMixedBonus] = useState(
    Math.floor(app.requested_hours / 2)
  );
  const [comment, setComment] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const HOURLY_RATE = 350;
  const fullFreelanceCost = app.requested_hours * HOURLY_RATE;
  const bonusCost = fullFreelanceCost * 0.5;
  const bonusSavings = Math.round(fullFreelanceCost - bonusCost);

  const mixedFreelanceCost = mixedFreelance * HOURLY_RATE;
  const mixedBonusCost = mixedBonus * HOURLY_RATE * 0.5;
  const mixedTotal = mixedFreelanceCost + mixedBonusCost;
  const mixedSavings = Math.round(fullFreelanceCost - mixedTotal);

  const isBlocked =
    app.source === "INTERNAL" &&
    simulation?.blocked === true &&
    (variant === "FULL" || variant === "PARTIAL");

  const commentRequired = variant === "REJECT";
  const commentValid =
    !commentRequired || (comment.trim().length >= 10);

  const rejectValid =
    variant !== "REJECT" || rejectReason.trim().length >= 10;

  const partialValid =
    variant !== "PARTIAL" ||
    (partialHours > 0 && partialHours < app.requested_hours);

  const mixedValid =
    variant !== "MIXED" ||
    mixedFreelance + mixedBonus === app.requested_hours;

  const canSubmit =
    variant !== null &&
    !isBlocked &&
    rejectValid &&
    partialValid &&
    mixedValid &&
    commentValid;

  function decisionLabel(): string {
    switch (variant) {
      case "FULL":
        return t("option_full");
      case "PARTIAL":
        return `${t("option_partial")} — ${partialHours} ч`;
      case "REJECT":
        return t("option_reject");
      case "BONUS":
        return t("option_bonus");
      case "MIXED":
        return `${t("option_mixed")} (${mixedFreelance}+${mixedBonus} ч)`;
      default:
        return "";
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      let result;
      const finalComment = comment.trim() || undefined;
      const rejectComment = rejectReason.trim();

      if (variant === "FULL") {
        result = await approveApplicationFull(app.id, finalComment);
      } else if (variant === "PARTIAL") {
        result = await approveApplicationPartial(
          app.id,
          partialHours,
          finalComment
        );
      } else if (variant === "REJECT") {
        result = await rejectApplication(app.id, rejectComment);
      } else if (variant === "BONUS") {
        result = await replaceWithBonus(
          app.id,
          finalComment ?? t("option_bonus")
        );
      } else if (variant === "MIXED") {
        result = await approveMixed(
          app.id,
          mixedFreelance,
          mixedBonus,
          finalComment ?? t("option_mixed")
        );
      }

      if (result?.success) {
        if (
          (variant === "BONUS" || variant === "MIXED") &&
          result.id
        ) {
          toast.success(t("confirm_dialog_ok"), {
            description: `${t("confirm_dialog_ok")} — ${decisionLabel()}`,
            action: {
              label: "Перейти к бонусу",
              onClick: () =>
                router.push(
                  `${ADMIN_ROUTES.bonusTasks}?budget_id=${result.id}`
                ),
            },
          });
        } else {
          toast.success(t("confirm_dialog_ok"));
        }
        if (result.warning) {
          toast.info(result.warning);
        }
        setConfirmOpen(false);
        onRefresh();
      } else if (result?.error?.code === "BUDGET_EXCEEDED") {
        toast.error(result.error.message);
      } else {
        toast.error(result?.error?.message ?? "Ошибка");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RadioGroup
            value={variant ?? ""}
            onValueChange={(v) => setVariant(v as DecisionVariant)}
            className="flex flex-col gap-2"
          >
            {(
              [
                ["FULL", t("option_full")],
                ["PARTIAL", t("option_partial")],
                ["REJECT", t("option_reject")],
                ["BONUS", t("option_bonus")],
                ["MIXED", t("option_mixed")],
              ] as [DecisionVariant, string][]
            ).map(([value, label]) => (
              <div
                key={value as string}
                className="flex items-start gap-2.5 rounded-md border border-border p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setVariant(value)}
              >
                <RadioGroupItem
                  value={value as string}
                  id={`option-${value}`}
                  className="mt-0.5 shrink-0"
                />
                <Label
                  htmlFor={`option-${value}`}
                  className="text-sm leading-snug cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* PARTIAL: hours input */}
          {variant === "PARTIAL" && (
            <div className="flex flex-col gap-1.5 pl-1">
              <Label className="text-xs">{t("partial_hours_label")}</Label>
              <Input
                type="number"
                min={0.5}
                max={app.requested_hours - 0.5}
                step={0.5}
                value={partialHours}
                onChange={(e) => setPartialHours(Number(e.target.value))}
                className="h-8 text-sm"
              />
              {!partialValid && (
                <p className="text-xs text-destructive">
                  0 &lt; часов &lt; {app.requested_hours}
                </p>
              )}
            </div>
          )}

          {/* REJECT: reason */}
          {variant === "REJECT" && (
            <div className="flex flex-col gap-1.5 pl-1">
              <Label className="text-xs">{t("reject_reason_label")}</Label>
              <Textarea
                placeholder={t("reject_reason_hint")}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
              {rejectReason.length > 0 && rejectReason.length < 10 && (
                <p className="text-xs text-destructive">
                  {t("reject_reason_hint")}
                </p>
              )}
            </div>
          )}

          {/* BONUS info */}
          {variant === "BONUS" && (
            <div className="rounded-md bg-info/10 px-3 py-2.5 text-xs text-foreground pl-1">
              <p>
                {t("bonus_info", { hours: app.requested_hours })}
              </p>
              <p className="mt-1 font-medium text-success">
                {t("bonus_savings", {
                  savings: bonusSavings.toLocaleString("ru"),
                })}
              </p>
            </div>
          )}

          {/* MIXED: two inputs */}
          {variant === "MIXED" && (
            <div className="flex flex-col gap-2.5 pl-1">
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <Label className="text-xs">
                    {t("mixed_freelance_label")}
                  </Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={app.requested_hours - 0.5}
                    step={0.5}
                    value={mixedFreelance}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMixedFreelance(v);
                      setMixedBonus(app.requested_hours - v);
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <Label className="text-xs">{t("mixed_bonus_label")}</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={app.requested_hours - 0.5}
                    step={0.5}
                    value={mixedBonus}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMixedBonus(v);
                      setMixedFreelance(app.requested_hours - v);
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              {!mixedValid ? (
                <p className="text-xs text-destructive">
                  {t("mixed_sum_hint", { total: app.requested_hours })}
                </p>
              ) : (
                <p className="text-xs text-success">
                  {t("mixed_savings", {
                    savings: mixedSavings.toLocaleString("ru"),
                  })}
                </p>
              )}
            </div>
          )}

          {/* Comment */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              {t("comment_label")}{" "}
              <span className="text-muted-foreground">
                ({commentRequired ? t("comment_required") : t("comment_optional")})
              </span>
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Budget blocked alert */}
          {isBlocked && simulation?.blocked_reason && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                {simulation.blocked_reason}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full">
                  <Button
                    className="w-full"
                    disabled={!canSubmit || submitting}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {t("submit_label")}
                  </Button>
                </span>
              </TooltipTrigger>
              {isBlocked && (
                <TooltipContent>
                  <p>{t("submit_blocked_tooltip")}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_dialog_desc", { decision: decisionLabel() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
              {t("confirm_dialog_ok")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ASSIGNMENT SIDEBAR
// ═══════════════════════════════════════════════════════════════════

function AssignmentSidebar({
  app,
  assignments,
  onRefresh,
}: {
  app: ApplicationDetailData;
  assignments: FreelancerAssignment[];
  onRefresh: () => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.assignment_card");
  const tToast = useTranslations("screen.freelanceApplicationDetail.toasts");
  const router = useRouter();
  const locale = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const approvedHours = app.approved_hours ?? app.requested_hours;
  const plannedDate = new Date(app.planned_date);

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      const res = await removeAssignment(id);
      if (res.success) {
        toast.success(tToast("assignment_removed"));
        onRefresh();
      } else {
        toast.error(res.error?.message ?? tToast("error"));
      }
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {t("approved_summary", {
              hours: approvedHours,
              date: formatDate(plannedDate, locale as "ru" | "en"),
            })}
          </p>

          {assignments.length === 0 ? (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                {t("no_assignee_warning")}
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              {assignments.map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setSheetOpen(true)}
            >
              <Plus className="size-3.5" />
              {t("assign_cta")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="w-full gap-1.5"
              onClick={() =>
                router.push(
                  `${ADMIN_ROUTES.taskNew}?freelance_application_id=${app.id}`
                )
              }
            >
              <ListChecks className="size-3.5" />
              {t("create_tasks_cta")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AssignSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        applicationId={app.id}
        paymentMode={undefined}
        onSuccess={onRefresh}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TERMINAL SIDEBAR (rejected / bonus / cancelled)
// ═══════════════════════════════════════════════════════════════════

function TerminalSidebar({ app }: { app: ApplicationDetailData }) {
  const t = useTranslations("screen.freelanceApplicationDetail.terminal_block");
  const locale = useLocale();

  const titleKey =
    app.status === "REJECTED"
      ? "rejected_title"
      : app.status === "REPLACED_WITH_BONUS" || app.status === "MIXED"
      ? "bonus_title"
      : "cancelled_title";

  return (
    <Card>
      <CardContent className="pt-5 flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">{t(titleKey)}</p>
        {app.decision_comment && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              {t("reason_label")}
            </p>
            <p className="text-sm text-foreground">{app.decision_comment}</p>
          </div>
        )}
        {app.decided_by_name && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("decided_by")}: {app.decided_by_name}</span>
            {app.decided_at && (
              <span>
                {formatDate(new Date(app.decided_at), locale as "ru" | "en")}
              </span>
            )}
          </div>
        )}
        {(app.status === "REPLACED_WITH_BONUS" || app.status === "MIXED") &&
          app.replaced_with_bonus_budget_id && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              asChild
            >
              <a
                href={`${ADMIN_ROUTES.bonusTasks}?budget_id=${app.replaced_with_bonus_budget_id}`}
              >
                <ExternalLink className="size-3.5" />
                {t("go_bonus_pool")}
              </a>
            </Button>
          )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EXTERNAL SIDEBAR
// ═══════════════════════════════════════════════════════════════════

function ExternalSidebar({
  app,
  assignments,
  onRefresh,
}: {
  app: ApplicationDetailData;
  assignments: FreelancerAssignment[];
  onRefresh: () => void;
}) {
  const t = useTranslations("screen.freelanceApplicationDetail.external_block");
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Card>
        <CardContent className="pt-5 flex flex-col gap-3">
          <p className="text-sm font-medium">{t("title")}</p>
          <p className="text-xs text-muted-foreground">{t("desc")}</p>
          {app.external_ref && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs">
              <span className="text-muted-foreground">{t("ref_label")}: </span>
              <span className="font-mono font-medium text-foreground">
                {app.external_ref}
              </span>
            </div>
          )}
          {assignments.length === 0 ? (
            <Button size="sm" onClick={() => setSheetOpen(true)} className="w-full gap-1.5">
              <Plus className="size-3.5" />
              Назначить исполнителя
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={() =>
                router.push(
                  `${ADMIN_ROUTES.taskNew}?freelance_application_id=${app.id}`
                )
              }
            >
              <ListChecks className="size-3.5" />
              Создать задачи на смену
            </Button>
          )}
        </CardContent>
      </Card>

      <AssignSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        applicationId={app.id}
        paymentMode={undefined}
        onSuccess={onRefresh}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RELATED ENTITIES CARD
// ═══════════════════════════════════════════════════════════════════

function RelatedCard({ app }: { app: ApplicationDetailData }) {
  const t = useTranslations("screen.freelanceApplicationDetail.related_card");
  const hasBonus =
    app.status === "REPLACED_WITH_BONUS" || app.status === "MIXED";
  const hasServices =
    app.status === "APPROVED_FULL" ||
    app.status === "APPROVED_PARTIAL" ||
    app.status === "MIXED";

  if (!hasBonus && !hasServices) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {hasBonus && app.replaced_with_bonus_budget_id && (
          <a
            href={`${ADMIN_ROUTES.bonusTasks}?budget_id=${app.replaced_with_bonus_budget_id}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            {t("bonus_pool")} — {app.replaced_with_bonus_budget_id}
          </a>
        )}
        {hasServices && (
          <a
            href={`${ADMIN_ROUTES.freelanceServices}?application_id=${app.id}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            {t("services")}
          </a>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ApplicationDetail({ id }: { id: string }) {
  const t = useTranslations("screen.freelanceApplicationDetail");
  const tHeader = useTranslations("screen.freelanceApplicationDetail.header");
  const tParams = useTranslations("screen.freelanceApplicationDetail.params_card");
  const tFinance = useTranslations("screen.freelanceApplicationDetail.finance_card");
  const tHistory = useTranslations("screen.freelanceApplicationDetail.history_card");
  const tStates = useTranslations("screen.freelanceApplicationDetail.states");
  const locale = useLocale();

  const [data, setData] = useState<ApplicationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<FreelancerAssignment[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Simulator state
  const [simHours, setSimHours] = useState<number>(0);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getFreelanceApplicationById(id);
      setData(res.data);
      setSimHours(res.data.requested_hours);
      const aRes = await getAssignmentsByApplication(id);
      setAssignments(aRes.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runSimulation = useCallback(
    async (hours: number, appId: string) => {
      if (hours <= 0) return;
      setSimLoading(true);
      try {
        const res = await simulateApplicationApproval(appId, hours);
        setSimulation(res.data);
      } catch {
        // silently ignore sim errors — advisory only
      } finally {
        setSimLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!data) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSimulation(simHours, data.id);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [simHours, data, runSimulation]);

  // ── States ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <ApplicationDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="size-4" />
          <AlertTitle>{tStates("error_title")}</AlertTitle>
          <AlertDescription>{tStates("error_desc")}</AlertDescription>
        </Alert>
        <Button onClick={load} variant="outline" className="gap-2">
          <RefreshCw className="size-4" />
          {tStates("error_retry")}
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Info}
        title={tStates("not_found_title")}
        description={tStates("not_found_desc")}
        action={{
          label: tStates("not_found_cta"),
          href: ADMIN_ROUTES.freelanceApplications,
        }}
      />
    );
  }

  // ── Derived values ────────────────────────────────────────────────

  const isExternal = data.source === "EXTERNAL";
  const isPending = data.status === "PENDING" && !isExternal;
  const isApproved =
    data.status === "APPROVED_FULL" ||
    data.status === "APPROVED_PARTIAL" ||
    data.status === "MIXED";
  const isTerminal =
    data.status === "REJECTED" ||
    data.status === "REPLACED_WITH_BONUS" ||
    data.status === "CANCELLED";

  const monthUsage = data.budget_usage.find((u) => u.period === "MONTH");
  const estimatedCost = data.requested_hours * 350; // fallback rate

  const breadcrumbs = [
    { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumbs.freelance"), href: ADMIN_ROUTES.freelanceDashboard },
    {
      label: t("breadcrumbs.applications"),
      href: ADMIN_ROUTES.freelanceApplications,
    },
    { label: t("breadcrumbs.detail") },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={tHeader("title", {
          shortId: shortId(data.id),
          storeName: data.store_name,
        })}
        subtitle={tHeader("created_by", {
          name: data.created_by_name,
          role: data.created_by_role,
          time: formatRelative(new Date(data.created_at), locale as "ru" | "en"),
        })}
        breadcrumbs={breadcrumbs}
      />

      {/* Two-col layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0 flex-1 max-w-3xl">

          {/* Header card with alerts + status */}
          <Card>
            <CardContent className="pt-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Source badge */}
                <Badge
                  variant="outline"
                  className="gap-1 text-xs"
                >
                  {isExternal && <Link2 className="size-3" />}
                  {isExternal
                    ? tHeader("source_external")
                    : tHeader("source_internal")}
                </Badge>
                <ApplicationStatusBadge status={data.status} />
              </div>

              {/* Alerts */}
              {data.urgent && (
                <Alert>
                  <AlertTriangle className="size-4 text-warning" />
                  <AlertTitle className="text-warning">
                    {tHeader("urgent_alert_title")}
                  </AlertTitle>
                  <AlertDescription>
                    {tHeader("urgent_alert_desc")}
                  </AlertDescription>
                </Alert>
              )}
              {data.retroactive && (
                <Alert>
                  <Info className="size-4 text-info" />
                  <AlertTitle className="text-info">
                    {tHeader("retroactive_alert_title")}
                  </AlertTitle>
                  <AlertDescription>
                    {tHeader("retroactive_alert_desc")}
                  </AlertDescription>
                </Alert>
              )}
              {isExternal && data.external_ref && (
                <Alert>
                  <Info className="size-4" />
                  <AlertTitle>{tHeader("external_alert_title")}</AlertTitle>
                  <AlertDescription>
                    {tHeader("external_alert_desc", { ref: data.external_ref })}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Params card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{tParams("title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {tParams("planned_date")}
                  </dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {formatDate(new Date(data.planned_date), locale as "ru" | "en")}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({formatRelative(new Date(data.planned_date), locale as "ru" | "en")})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {tParams("hours_requested")}
                  </dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {data.requested_hours} {tParams("hours_unit")}
                    {data.status === "APPROVED_PARTIAL" &&
                      data.approved_hours != null && (
                        <span className="ml-1.5 text-xs text-muted-foreground line-through">
                          {data.requested_hours} {tParams("hours_unit")}
                        </span>
                      )}
                  </dd>
                </div>
                {data.approved_hours != null &&
                  data.status !== "APPROVED_FULL" && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {tParams("hours_approved")}
                      </dt>
                      <dd className="font-medium text-success mt-0.5">
                        {data.approved_hours} {tParams("hours_unit")}
                      </dd>
                    </div>
                  )}
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {tParams("work_type")}
                  </dt>
                  <dd className="mt-0.5">
                    <WorkTypeBadge
                      workType={{
                        id: data.work_type_id,
                        name: data.work_type_name,
                      }}
                      size="sm"
                    />
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    {tParams("location")}
                  </dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {data.store_name}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    {tParams("comment")}
                  </dt>
                  <dd className="text-foreground mt-0.5">
                    {data.comment || tParams("no_comment")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Finance card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{tFinance("title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Banners */}
              {isExternal && (
                <div className="flex items-start gap-2 rounded-md bg-info/10 px-3 py-2.5 text-xs text-foreground">
                  <Info className="size-3.5 mt-0.5 shrink-0 text-info" />
                  {tFinance("external_banner")}
                </div>
              )}

              {/* Cost */}
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  {tFinance("cost_label")}
                </span>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    {estimatedCost.toLocaleString("ru")} ₽
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tFinance("cost_breakdown", {
                      hours: data.requested_hours,
                      rate: 350,
                    })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Budget usage */}
              {monthUsage ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {tFinance("budget_usage_title", {
                      period: tFinance("period_MONTH"),
                    })}
                  </p>
                  <BudgetUsageRow
                    usage={monthUsage}
                    periodLabel={tFinance("period_MONTH")}
                    simulatedActual={
                      simulation
                        ? simulation.after_approval.actual_amount
                        : undefined
                    }
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Данные бюджета недоступны
                </p>
              )}

              <Separator />

              {/* Simulator */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">
                  {tFinance("simulator_title")}
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{tFinance("simulator_hours_label")}</span>
                    <span className="font-medium text-foreground">
                      {simHours} ч
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={data.requested_hours}
                    step={0.5}
                    value={[simHours]}
                    onValueChange={([v]) => setSimHours(v)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>{data.requested_hours} ч</span>
                  </div>
                </div>

                {simLoading && (
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                )}

                {!simLoading && simulation && (
                  <div className="rounded-md bg-muted/60 px-3 py-2.5 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {tFinance("simulator_new_cost")}
                      </span>
                      <span className="font-medium text-foreground">
                        {simulation.cost.toLocaleString("ru")} ₽
                      </span>
                    </div>
                    {simulation.after_approval.overspend > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {tFinance("simulator_overspend_after")}
                        </span>
                        <span className="font-medium text-destructive">
                          +{simulation.after_approval.overspend.toLocaleString("ru")} ₽
                          {" "}(+{simulation.after_approval.overspend_pct}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Blocked alert (INTERNAL only) */}
                {!isExternal && simulation?.blocked && (
                  <Alert variant="destructive">
                    <AlertTriangle className="size-4" />
                    <AlertDescription className="text-xs">
                      {tFinance("simulator_blocked_alert", {
                        period: tFinance("period_MONTH"),
                        pct: simulation.after_approval.overspend_pct,
                      })}
                      {" "}
                      {tFinance("simulator_blocked_details", {
                        actual: simulation.after_approval.actual_amount.toLocaleString("ru"),
                        limit: simulation.after_approval.limit_amount.toLocaleString("ru"),
                      })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* History card */}
          <Card>
            <CardHeader className="pb-0">
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => setHistoryExpanded((p) => !p)}
              >
                <CardTitle className="text-sm">{tHistory("title")}</CardTitle>
                {historyExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {historyExpanded && (
              <CardContent className="pt-3">
                {data.history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    История пуста
                  </p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {data.history.map((evt, i) => {
                      const actionKey = `action_${evt.action}` as Parameters<typeof tHistory>[0];
                      return (
                        <li key={i} className="flex gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="size-2 rounded-full bg-primary mt-1 shrink-0" />
                            {i < data.history.length - 1 && (
                              <div className="w-px flex-1 bg-border" />
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 pb-3 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">
                                {evt.actor_name}
                              </span>
                              {i === 0 && (
                                <RoleBadge
                                  role={data.created_by_role}
                                  size="sm"
                                />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatRelative(
                                  new Date(evt.occurred_at),
                                  locale as "ru" | "en"
                                )}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {tHistory(actionKey)}
                            </span>
                            {evt.comment && (
                              <p className="text-xs text-foreground bg-muted/40 rounded px-2 py-1 mt-0.5">
                                {evt.comment}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <div className="lg:w-80 lg:shrink-0 flex flex-col gap-4">
          {/* Decision sidebar: only for PENDING INTERNAL */}
          {isPending && (
            <DecisionSidebar
              app={data}
              simulation={simulation}
              simulatedHours={simHours}
              onRefresh={load}
            />
          )}

          {/* External info block */}
          {isExternal && (
            <ExternalSidebar
              app={data}
              assignments={assignments}
              onRefresh={load}
            />
          )}

          {/* Assignment sidebar: for approved */}
          {isApproved && !isExternal && (
            <AssignmentSidebar
              app={data}
              assignments={assignments}
              onRefresh={load}
            />
          )}

          {/* Terminal: rejected / bonus / cancelled */}
          {isTerminal && <TerminalSidebar app={data} />}

          {/* Related entities */}
          <RelatedCard app={data} />
        </div>
      </div>
    </div>
  );
}
