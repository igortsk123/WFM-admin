"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, parseISO } from "date-fns";
import {
  Plus,
  MoreVertical,
  Pencil,
  CalendarX2,
  History,
  Info,
  Wallet,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/contexts/auth-context";
import {
  getBudgetLimits,
  createBudgetLimit,
  updateBudgetLimit,
  getBudgetUsage,
} from "@/lib/api/freelance-budget";
import type { BudgetLimit, BudgetUsage, BudgetPeriod } from "@/lib/types";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { PageHeader } from "@/components/shared/page-header";
import { FilterChip } from "@/components/shared/filter-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityFeed, type ActivityItem } from "@/components/shared/activity-feed";

import { Button } from "@/components/ui/button";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date();
const TODAY_ISO = TODAY.toISOString().slice(0, 10);

function formatRelative(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffMin < 1) return rtf.format(0, "minute");
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffH < 24) return rtf.format(-diffH, "hour");
  if (diffD < 7) return rtf.format(-diffD, "day");
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function isExpired(limit: BudgetLimit): boolean {
  if (!limit.valid_to) return false;
  return limit.valid_to <= TODAY_ISO;
}

// ─── BudgetPeriodBadge ────────────────────────────────────────────────────────

interface BudgetPeriodBadgeProps {
  period: BudgetPeriod;
}

function BudgetPeriodBadge({ period }: BudgetPeriodBadgeProps) {
  const t = useTranslations("freelanceBudgetLimits.period");
  const variantMap: Record<BudgetPeriod, string> = {
    DAY: "bg-info/10 text-info border-info/20",
    WEEK: "bg-warning/10 text-warning border-warning/20",
    MONTH: "bg-primary/10 text-primary border-primary/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variantMap[period]
      )}
    >
      {t(period)}
    </span>
  );
}

// ─── BudgetUsageBar ───────────────────────────────────────────────────────────

interface BudgetUsageBarProps {
  usage: BudgetUsage | null;
  limitAmount: number;
  currency: string;
  isClientDirect: boolean;
}

function BudgetUsageBar({
  usage,
  limitAmount,
  currency,
  isClientDirect,
}: BudgetUsageBarProps) {
  const t = useTranslations("freelanceBudgetLimits.usage");

  if (!usage) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const pct = Math.min(
    Math.round((usage.actual_amount / limitAmount) * 100),
    100
  );
  const isOver = usage.actual_amount > limitAmount;
  const isWarning = pct >= 80 && !isOver;

  const barColor = isOver
    ? "bg-destructive"
    : isWarning
    ? "bg-warning"
    : "bg-success";

  const fmt = (n: number) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("absolute left-0 top-0 h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span
          className={cn(
            "font-medium tabular-nums",
            isOver ? "text-destructive" : isWarning ? "text-warning" : "text-foreground"
          )}
        >
          {fmt(usage.actual_amount)}
        </span>
        <span>{t("of")}</span>
        <span className="tabular-nums">{fmt(limitAmount)}</span>
        {isClientDirect && (
          <span className="ml-1 text-muted-foreground/60">
            ({t("indicative")})
          </span>
        )}
      </div>
    </div>
  );
}

// ─── LimitForm ────────────────────────────────────────────────────────────────

interface LimitFormValues {
  store_id: number | null;
  store_name: string;
  period: BudgetPeriod | "";
  amount: string;
  valid_from: Date | undefined;
  valid_to: Date | undefined;
}

interface LimitFormProps {
  mode: "create" | "edit";
  initial?: LimitFormValues;
  storeOptions: ComboboxOption[];
  lockedStore?: boolean;
  lockedPeriod?: boolean;
  onSubmit: (values: LimitFormValues) => Promise<void>;
  onCancel: () => void;
}

function LimitForm({
  mode,
  initial,
  storeOptions,
  lockedStore,
  lockedPeriod,
  onSubmit,
  onCancel,
}: LimitFormProps) {
  const t = useTranslations("freelanceBudgetLimits");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [values, setValues] = useState<LimitFormValues>(
    initial ?? {
      store_id: null,
      store_name: "",
      period: "",
      amount: "",
      valid_from: new Date(),
      valid_to: undefined,
    }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof LimitFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const PERIODS: BudgetPeriod[] = ["DAY", "WEEK", "MONTH"];

  function validate(): boolean {
    const errs: Partial<Record<keyof LimitFormValues, string>> = {};
    if (!values.store_id) errs.store_id = t("validation.amount_required");
    if (!values.period) errs.period = t("validation.amount_required");
    if (!values.amount || values.amount.trim() === "")
      errs.amount = t("validation.amount_required");
    else if (parseFloat(values.amount) <= 0)
      errs.amount = t("validation.amount_positive");
    if (!values.valid_from) errs.valid_from = t("validation.valid_from_required");
    if (values.valid_to && values.valid_from && values.valid_to <= values.valid_from)
      errs.valid_to = t("validation.valid_to_after_from");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
      {/* Object */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="store">{t("sheet.object_label")}</Label>
        {lockedStore ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {values.store_name}
          </div>
        ) : (
          <>
            <Combobox
              options={storeOptions}
              value={values.store_id ? String(values.store_id) : ""}
              onValueChange={(val) => {
                const opt = storeOptions.find((o) => o.value === val);
                setValues((v) => ({
                  ...v,
                  store_id: val ? parseInt(val, 10) : null,
                  store_name: opt?.label ?? "",
                }));
                if (errors.store_id) setErrors((e) => ({ ...e, store_id: undefined }));
              }}
              placeholder={t("sheet.object_placeholder")}
              searchPlaceholder={t("filters.search_object")}
            />
            {errors.store_id && (
              <p className="text-xs text-destructive">{errors.store_id}</p>
            )}
          </>
        )}
      </div>

      {/* Period */}
      <div className="flex flex-col gap-1.5">
        <Label>{t("sheet.period_label")}</Label>
        {lockedPeriod ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
            <BudgetPeriodBadge period={values.period as BudgetPeriod} />
          </div>
        ) : (
          <>
            <Select
              value={values.period}
              onValueChange={(val) => {
                setValues((v) => ({ ...v, period: val as BudgetPeriod }));
                if (errors.period) setErrors((e) => ({ ...e, period: undefined }));
              }}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder={t("sheet.period_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`period.${p}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.period && (
              <p className="text-xs text-destructive">{errors.period}</p>
            )}
          </>
        )}
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">{t("sheet.amount_label")}</Label>
        <Input
          id="amount"
          type="number"
          min={1}
          step={100}
          placeholder="50 000"
          className="min-h-11"
          value={values.amount}
          onChange={(e) => {
            setValues((v) => ({ ...v, amount: e.target.value }));
            if (errors.amount) setErrors((er) => ({ ...er, amount: undefined }));
          }}
          aria-invalid={!!errors.amount}
        />
        {errors.amount && (
          <p className="text-xs text-destructive">{errors.amount}</p>
        )}
      </div>

      {/* Valid from */}
      <div className="flex flex-col gap-1.5">
        <Label>{t("sheet.valid_from_label")}</Label>
        <DatePicker
          date={values.valid_from}
          onDateChange={(d) => {
            setValues((v) => ({ ...v, valid_from: d }));
            if (errors.valid_from) setErrors((e) => ({ ...e, valid_from: undefined }));
          }}
          placeholder={t("sheet.valid_from_label")}
          className="min-h-11"
        />
        {errors.valid_from && (
          <p className="text-xs text-destructive">{errors.valid_from}</p>
        )}
      </div>

      {/* Valid to */}
      <div className="flex flex-col gap-1.5">
        <Label>
          {t("sheet.valid_to_label")}{" "}
          <span className="text-muted-foreground font-normal text-xs">
            ({t("sheet.valid_to_placeholder")})
          </span>
        </Label>
        <div className="relative">
          <DatePicker
            date={values.valid_to}
            onDateChange={(d) => {
              setValues((v) => ({ ...v, valid_to: d }));
              if (errors.valid_to) setErrors((e) => ({ ...e, valid_to: undefined }));
            }}
            placeholder={t("indefinite")}
            className="min-h-11"
          />
          {values.valid_to && (
            <button
              type="button"
              aria-label="Clear end date"
              className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setValues((v) => ({ ...v, valid_to: undefined }))}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {errors.valid_to && (
          <p className="text-xs text-destructive">{errors.valid_to}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {mode === "create" ? t("sheet.submit_create") : t("sheet.submit_edit")}
        </Button>
      </div>
    </form>
  );
}

// ─── HistorySheet ─────────────────────────────────────────────────────────────

interface HistorySheetProps {
  limit: BudgetLimit;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function HistorySheet({ limit, open, onOpenChange }: HistorySheetProps) {
  const t = useTranslations("freelanceBudgetLimits");
  const locale = useLocale();

  // Synthetic history from the single set_at event on the limit
  const items: ActivityItem[] = useMemo(
    () => [
      {
        id: `${limit.id}-set`,
        timestamp: limit.set_at,
        actor: limit.set_by_name,
        action: `установил лимит ${limit.amount.toLocaleString("ru-RU")} ₽ (${limit.period})`,
        type: "TASK_CREATED" as const,
      },
    ],
    [limit]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{t("history_sheet.title")}</SheetTitle>
          <p className="text-sm text-muted-foreground">{limit.store_name}</p>
        </SheetHeader>
        <ActivityFeed items={items} />
      </SheetContent>
    </Sheet>
  );
}

// ─── LimitRow (desktop table row) ─────────────────────────────────────────────

interface LimitRowProps {
  limit: BudgetLimit;
  usage: BudgetUsage | null;
  isClientDirect: boolean;
  canWrite: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations<"freelanceBudgetLimits">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
  onEdit: (limit: BudgetLimit) => void;
  onTerminate: (limit: BudgetLimit) => void;
  onHistory: (limit: BudgetLimit) => void;
}

function LimitRow({
  limit,
  usage,
  isClientDirect,
  canWrite,
  locale,
  t,
  tCommon,
  onEdit,
  onTerminate,
  onHistory,
}: LimitRowProps) {
  const [terminateOpen, setTerminateOpen] = useState(false);

  return (
    <TableRow>
      {/* Object */}
      <TableCell className="min-w-[180px]">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground leading-tight">
            {limit.store_name.split(",")[0]}
          </span>
          {limit.store_name.includes(",") && (
            <span className="text-xs text-muted-foreground leading-tight">
              {limit.store_name.split(",").slice(1).join(",").trim()}
            </span>
          )}
        </div>
      </TableCell>

      {/* Period */}
      <TableCell>
        <BudgetPeriodBadge period={limit.period} />
      </TableCell>

      {/* Amount */}
      <TableCell className="tabular-nums text-sm font-medium">
        {limit.amount.toLocaleString("ru-RU")} {limit.currency}
      </TableCell>

      {/* Valid from */}
      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {format(parseISO(limit.valid_from), "dd.MM.yyyy")}
      </TableCell>

      {/* Valid to */}
      <TableCell className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {limit.valid_to ? format(parseISO(limit.valid_to), "dd.MM.yyyy") : (
          <span className="text-muted-foreground/60 italic">{t("indefinite")}</span>
        )}
      </TableCell>

      {/* Set by */}
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm text-foreground leading-tight">{limit.set_by_name}</span>
          <span className="text-xs text-muted-foreground leading-tight">
            {formatRelative(limit.set_at, locale)}
          </span>
        </div>
      </TableCell>

      {/* Usage */}
      <TableCell>
        <BudgetUsageBar
          usage={usage}
          limitAmount={limit.amount}
          currency={limit.currency}
          isClientDirect={isClientDirect}
        />
      </TableCell>

      {/* Actions */}
      {canWrite && (
        <TableCell>
          <AlertDialog open={terminateOpen} onOpenChange={setTerminateOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={tCommon("actions")}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(limit)}>
                  <Pencil className="size-4 mr-2" />
                  {t("menu.edit")}
                </DropdownMenuItem>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem>
                    <CalendarX2 className="size-4 mr-2" />
                    {t("menu.terminate")}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <DropdownMenuItem onClick={() => onHistory(limit)}>
                  <History className="size-4 mr-2" />
                  {t("menu.history")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
              title={t("terminate_dialog.title")}
              message={t("terminate_dialog.message")}
              confirmLabel={t("terminate_dialog.confirm")}
              variant="destructive"
              onConfirm={() => onTerminate(limit)}
              onOpenChange={setTerminateOpen}
            />
          </AlertDialog>
        </TableCell>
      )}
    </TableRow>
  );
}

// ─── MobileCard ───────────────────────────────────────────────────────────────

interface MobileCardProps {
  limit: BudgetLimit;
  usage: BudgetUsage | null;
  isClientDirect: boolean;
  canWrite: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations<"freelanceBudgetLimits">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
  onEdit: (limit: BudgetLimit) => void;
  onTerminate: (limit: BudgetLimit) => void;
  onHistory: (limit: BudgetLimit) => void;
}

function MobileCard({
  limit,
  usage,
  isClientDirect,
  canWrite,
  locale,
  t,
  tCommon,
  onEdit,
  onTerminate,
  onHistory,
}: MobileCardProps) {
  const [terminateOpen, setTerminateOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-foreground leading-tight">
            {limit.store_name.split(",")[0]}
          </span>
          {limit.store_name.includes(",") && (
            <span className="text-xs text-muted-foreground leading-tight">
              {limit.store_name.split(",").slice(1).join(",").trim()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BudgetPeriodBadge period={limit.period} />
          {canWrite && (
            <AlertDialog open={terminateOpen} onOpenChange={setTerminateOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={tCommon("actions")}>
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(limit)}>
                    <Pencil className="size-4 mr-2" />
                    {t("menu.edit")}
                  </DropdownMenuItem>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem>
                      <CalendarX2 className="size-4 mr-2" />
                      {t("menu.terminate")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <DropdownMenuItem onClick={() => onHistory(limit)}>
                    <History className="size-4 mr-2" />
                    {t("menu.history")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ConfirmDialog
                title={t("terminate_dialog.title")}
                message={t("terminate_dialog.message")}
                confirmLabel={t("terminate_dialog.confirm")}
                variant="destructive"
                onConfirm={() => onTerminate(limit)}
                onOpenChange={setTerminateOpen}
              />
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums font-semibold text-foreground text-sm">
          {limit.amount.toLocaleString("ru-RU")} {limit.currency}
        </span>
        <span>
          {format(parseISO(limit.valid_from), "dd.MM.yy")} –{" "}
          {limit.valid_to
            ? format(parseISO(limit.valid_to), "dd.MM.yy")
            : t("indefinite")}
        </span>
      </div>

      <BudgetUsageBar
        usage={usage}
        limitAmount={limit.amount}
        currency={limit.currency}
        isClientDirect={isClientDirect}
      />

      <div className="text-xs text-muted-foreground">
        {limit.set_by_name} · {formatRelative(limit.set_at, locale)}
      </div>
    </div>
  );
}

// ─── LimitsTable ──────────────────────────────────────────────────────────────

interface LimitsTableProps {
  limits: BudgetLimit[];
  usagesMap: Map<string, BudgetUsage>;
  isClientDirect: boolean;
  canWrite: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations<"freelanceBudgetLimits">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
  onEdit: (limit: BudgetLimit) => void;
  onTerminate: (limit: BudgetLimit) => void;
  onHistory: (limit: BudgetLimit) => void;
}

function LimitsTable({
  limits,
  usagesMap,
  isClientDirect,
  canWrite,
  locale,
  t,
  tCommon,
  onEdit,
  onTerminate,
  onHistory,
}: LimitsTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.object")}</TableHead>
              <TableHead>{t("table.period")}</TableHead>
              <TableHead>{t("table.limit")}</TableHead>
              <TableHead>{t("table.valid_from")}</TableHead>
              <TableHead>{t("table.valid_to")}</TableHead>
              <TableHead>{t("table.set_by")}</TableHead>
              <TableHead>{t("table.usage")}</TableHead>
              {canWrite && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {limits.map((limit) => (
              <LimitRow
                key={limit.id}
                limit={limit}
                usage={usagesMap.get(`${limit.store_id}:${limit.period}`) ?? null}
                isClientDirect={isClientDirect}
                canWrite={canWrite}
                locale={locale}
                t={t}
                tCommon={tCommon}
                onEdit={onEdit}
                onTerminate={onTerminate}
                onHistory={onHistory}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {limits.map((limit) => (
          <MobileCard
            key={limit.id}
            limit={limit}
            usage={usagesMap.get(`${limit.store_id}:${limit.period}`) ?? null}
            isClientDirect={isClientDirect}
            canWrite={canWrite}
            locale={locale}
            t={t}
            tCommon={tCommon}
            onEdit={onEdit}
            onTerminate={onTerminate}
            onHistory={onHistory}
          />
        ))}
      </div>
    </>
  );
}

// ─── BudgetLimits (main) ──────────────────────────────────────────────────────

export function BudgetLimits() {
  const t = useTranslations("freelanceBudgetLimits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();

  const isRegionalOrOps =
    user.role === "REGIONAL" || user.role === "NETWORK_OPS";
  const canWrite = isRegionalOrOps;

  // ── module guard ──
  if (!user.organization.freelance_module_enabled) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground text-sm">{t("module_disabled")}</p>
      </div>
    );
  }

  return <BudgetLimitsInner canWrite={canWrite} t={t} tCommon={tCommon} locale={locale} />;
}

// ─── BudgetLimitsInner ────────────────────────────────────────────────────────

interface InnerProps {
  canWrite: boolean;
  t: ReturnType<typeof useTranslations<"freelanceBudgetLimits">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
  locale: string;
}

function BudgetLimitsInner({ canWrite, t, tCommon, locale }: InnerProps) {
  const { user } = useAuth();
  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT";

  // ── data ──────────────────────────────────────────────────────────
  const [allLimits, setAllLimits] = useState<BudgetLimit[]>([]);
  const [usagesMap, setUsagesMap] = useState<Map<string, BudgetUsage>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [limitsRes, usageRes] = await Promise.all([
        getBudgetLimits({ page_size: 100 }),
        getBudgetUsage({}),
      ]);
      setAllLimits(limitsRes.data);

      const map = new Map<string, BudgetUsage>();
      usageRes.data.forEach((u) => map.set(`${u.store_id}:${u.period}`, u));
      setUsagesMap(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── filters ───────────────────────────────────────────────────────
  const [tab, setTab] = useState<"active" | "expired">("active");
  const [filterStores, setFilterStores] = useState<string[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<BudgetPeriod | "">("");

  const storeOptions = useMemo<ComboboxOption[]>(() => {
    const seen = new Set<string>();
    const opts: ComboboxOption[] = [];
    allLimits.forEach((l) => {
      const key = String(l.store_id);
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ value: key, label: l.store_name });
      }
    });
    return opts;
  }, [allLimits]);

  const filteredLimits = useMemo(() => {
    return allLimits.filter((l) => {
      if (tab === "active" && isExpired(l)) return false;
      if (tab === "expired" && !isExpired(l)) return false;
      if (filterStores.length > 0 && !filterStores.includes(String(l.store_id)))
        return false;
      if (filterPeriod && l.period !== filterPeriod) return false;
      return true;
    });
  }, [allLimits, tab, filterStores, filterPeriod]);

  // Active chips
  const activeChips: Array<{ id: string; label: string; value: string; onRemove: () => void }> =
    useMemo(() => {
      const chips: Array<{ id: string; label: string; value: string; onRemove: () => void }> = [];
      filterStores.forEach((sid) => {
        const name = storeOptions.find((o) => o.value === sid)?.label ?? sid;
        chips.push({
          id: `store-${sid}`,
          label: t("filters.object"),
          value: name,
          onRemove: () =>
            setFilterStores((prev) => prev.filter((s) => s !== sid)),
        });
      });
      if (filterPeriod) {
        chips.push({
          id: `period-${filterPeriod}`,
          label: t("filters.period"),
          value: t(`period.${filterPeriod}`),
          onRemove: () => setFilterPeriod(""),
        });
      }
      return chips;
    }, [filterStores, filterPeriod, storeOptions, t]);

  // ── sheet state ───────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetLimit | null>(null);
  const [historyTarget, setHistoryTarget] = useState<BudgetLimit | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  function openCreate() {
    setEditTarget(null);
    setSheetOpen(true);
  }

  function openEdit(limit: BudgetLimit) {
    setEditTarget(limit);
    setSheetOpen(true);
  }

  function openHistory(limit: BudgetLimit) {
    setHistoryTarget(limit);
    setHistoryOpen(true);
  }

  // ── mutations ─────────────────────────────────────────────────────
  async function handleSubmit(values: LimitFormValues) {
    if (editTarget) {
      const res = await updateBudgetLimit(editTarget.id, {
        amount: parseFloat(values.amount),
        valid_from: values.valid_from
          ? format(values.valid_from, "yyyy-MM-dd")
          : undefined,
        valid_to: values.valid_to
          ? format(values.valid_to, "yyyy-MM-dd")
          : null,
      });
      if (res.success) {
        toast.success(t("toasts.updated"));
        setSheetOpen(false);
        await loadData();
      } else {
        toast.error(t("toasts.error"));
      }
    } else {
      const res = await createBudgetLimit({
        store_id: values.store_id ?? undefined,
        store_name: values.store_name,
        period: values.period as BudgetPeriod,
        amount: parseFloat(values.amount),
        currency: "RUB",
        valid_from: values.valid_from
          ? format(values.valid_from, "yyyy-MM-dd")
          : TODAY_ISO,
        valid_to: values.valid_to
          ? format(values.valid_to, "yyyy-MM-dd")
          : null,
      });
      if (res.success) {
        toast.success(t("toasts.created"));
        setSheetOpen(false);
        await loadData();
      } else {
        toast.error(t("toasts.error"));
      }
    }
  }

  async function handleTerminate(limit: BudgetLimit) {
    const res = await updateBudgetLimit(limit.id, {
      valid_to: TODAY_ISO,
    });
    if (res.success) {
      toast.success(t("toasts.terminated"));
      await loadData();
    } else {
      toast.error(t("toasts.error"));
    }
  }

  // ── render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          {
            label: t("breadcrumbs.freelance"),
            href: ADMIN_ROUTES.freelanceDashboard,
          },
          { label: t("breadcrumbs.limits") },
        ]}
        actions={
          canWrite ? (
            <Button onClick={openCreate} size="sm" className="min-h-11">
              <Plus className="size-4 mr-1.5" aria-hidden="true" />
              {t("actions.add")}
            </Button>
          ) : undefined
        }
      />

      {/* Info banner */}
      <Alert>
        <Info className="size-4" aria-hidden="true" />
        <AlertDescription className="text-sm leading-relaxed">
          {t("info_banner")}
        </AlertDescription>
      </Alert>

      {/* Tabs — desktop */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "active" | "expired")}
      >
        <div className="flex flex-col gap-4">
          {/* Tab switcher + filters row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Tabs (desktop) / Select (mobile) */}
            <div className="hidden sm:block">
              <TabsList>
                <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
                <TabsTrigger value="expired">{t("tabs.expired")}</TabsTrigger>
              </TabsList>
            </div>

            {/* Mobile tab select */}
            <div className="sm:hidden">
              <Select
                value={tab}
                onValueChange={(v) => setTab(v as "active" | "expired")}
              >
                <SelectTrigger className="w-full min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("tabs.active")}</SelectItem>
                  <SelectItem value="expired">{t("tabs.expired")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap gap-2">
              {/* Object filter */}
              <Combobox
                options={storeOptions}
                value=""
                onValueChange={(val) => {
                  if (val && !filterStores.includes(val)) {
                    setFilterStores((prev) => [...prev, val]);
                  }
                }}
                placeholder={t("filters.object_placeholder")}
                searchPlaceholder={t("filters.search_object")}
                className="w-44 min-h-11"
              />

              {/* Period filter */}
              <Select
                value={filterPeriod}
                onValueChange={(v) =>
                  setFilterPeriod(v === "all" ? "" : (v as BudgetPeriod))
                }
              >
                <SelectTrigger className="w-36 min-h-11">
                  <SelectValue placeholder={t("filters.period_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("period.all")}</SelectItem>
                  <SelectItem value="DAY">{t("period.DAY")}</SelectItem>
                  <SelectItem value="WEEK">{t("period.WEEK")}</SelectItem>
                  <SelectItem value="MONTH">{t("period.MONTH")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={tCommon("filters")}
            >
              {activeChips.map((chip) => (
                <FilterChip
                  key={chip.id}
                  label={chip.label}
                  value={chip.value}
                  onRemove={chip.onRemove}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  setFilterStores([]);
                  setFilterPeriod("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors px-1"
              >
                {tCommon("clearAll")}
              </button>
            </div>
          )}

          {/* Content */}
          <TabsContent value="active" className="mt-0">
            {loading ? (
              <LoadingSkeleton />
            ) : filteredLimits.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title={t("empty.no_limits_title")}
                description={
                  canWrite
                    ? t("empty.no_limits_desc_regional")
                    : t("empty.no_limits_desc_supervisor")
                }
                action={
                  canWrite
                    ? { label: t("actions.add"), onClick: openCreate, icon: Plus }
                    : undefined
                }
              />
            ) : (
              <LimitsTable
                limits={filteredLimits}
                usagesMap={usagesMap}
                isClientDirect={isClientDirect}
                canWrite={canWrite}
                locale={locale}
                t={t}
                tCommon={tCommon}
                onEdit={openEdit}
                onTerminate={handleTerminate}
                onHistory={openHistory}
              />
            )}
          </TabsContent>

          <TabsContent value="expired" className="mt-0">
            {loading ? (
              <LoadingSkeleton />
            ) : filteredLimits.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title={t("tabs.expired")}
                description={tCommon("no_data")}
              />
            ) : (
              <LimitsTable
                limits={filteredLimits}
                usagesMap={usagesMap}
                isClientDirect={isClientDirect}
                canWrite={canWrite}
                locale={locale}
                t={t}
                tCommon={tCommon}
                onEdit={openEdit}
                onTerminate={handleTerminate}
                onHistory={openHistory}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>
              {editTarget ? t("sheet.edit_title") : t("sheet.create_title")}
            </SheetTitle>
          </SheetHeader>
          <LimitForm
            mode={editTarget ? "edit" : "create"}
            storeOptions={storeOptions}
            lockedStore={!!editTarget}
            lockedPeriod={!!editTarget}
            initial={
              editTarget
                ? {
                    store_id: editTarget.store_id,
                    store_name: editTarget.store_name,
                    period: editTarget.period,
                    amount: String(editTarget.amount),
                    valid_from: editTarget.valid_from
                      ? parseISO(editTarget.valid_from)
                      : new Date(),
                    valid_to: editTarget.valid_to
                      ? parseISO(editTarget.valid_to)
                      : undefined,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* History Sheet */}
      {historyTarget && (
        <HistorySheet
          limit={historyTarget}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}
    </div>
  );
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-lg bg-muted animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
