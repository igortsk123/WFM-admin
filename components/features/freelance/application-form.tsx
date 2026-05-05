"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  AlertCircle,
  Clock,
  History,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { format, addDays, startOfDay, isBefore } from "date-fns";
import { ru } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/shared";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  createFreelanceApplication,
} from "@/lib/api/freelance-applications";
import { getServiceNorms } from "@/lib/api/freelance-norms";
import { getBudgetUsage, getBudgetLimits } from "@/lib/api/freelance-budget";
import type { ServiceNorm, BudgetUsage, Store } from "@/lib/types/index";

// ─── Role helpers ──────────────────────────────────────────────────────────────

type AllowedRole = "STORE_DIRECTOR" | "SUPERVISOR" | "REGIONAL" | "NETWORK_OPS";

function isSupervisorOrAbove(role: string): role is "SUPERVISOR" | "REGIONAL" | "NETWORK_OPS" {
  return role === "SUPERVISOR" || role === "REGIONAL" || role === "NETWORK_OPS";
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

const today = () => startOfDay(new Date());
const minDate = (role: string) =>
  isSupervisorOrAbove(role) ? undefined : addDays(today(), 3);

function deriveFlags(date: Date | undefined) {
  if (!date) return { urgent: false, retroactive: false };
  const d = startOfDay(date);
  const t = today();
  const threeDaysOut = addDays(t, 3);
  if (isBefore(d, t)) return { urgent: false, retroactive: true };
  if (isBefore(d, threeDaysOut)) return { urgent: true, retroactive: false };
  return { urgent: false, retroactive: false };
}

function isTooEarlyForDirector(date: Date | undefined): boolean {
  if (!date) return false;
  return isBefore(startOfDay(date), addDays(today(), 3));
}

// ─── Zod schema ────────────────────────────────────────────────────────────────

function buildSchema(role: string, t: (k: string) => string) {
  const isDirector = role === "STORE_DIRECTOR";

  return z.object({
    store_id: z.number({ message: t("store_required") }).positive(t("store_required")),
    planned_date: z.date({ message: t("date_required") }),
    requested_hours: z
      .number({ message: t("hours_required") })
      .min(0.5, t("hours_min"))
      .max(24, t("hours_max")),
    work_type_id: z.number({ message: t("work_type_required") }).positive(t("work_type_required")),
    comment: z.string().max(500).optional(),
  }).superRefine((data, ctx) => {
    if (isDirector && data.planned_date && isTooEarlyForDirector(data.planned_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("date_too_early"),
        path: ["planned_date"],
      });
    }
  });
}

type FormValues = {
  store_id: number;
  planned_date: Date;
  requested_hours: number;
  work_type_id: number;
  comment?: string;
};

// ─── Main component ────────────────────────────────────────────────────────────

export function ApplicationForm() {
  const t = useTranslations("screen.freelanceApplicationNew");
  const tV = useTranslations("screen.freelanceApplicationNew.validation");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user } = useAuth();

  const role = user.role as AllowedRole;
  const isDirector = role === "STORE_DIRECTOR";
  const isSupervisorPlus = isSupervisorOrAbove(role);

  // Redirect if module disabled
  const moduleEnabled = user.organization.freelance_module_enabled;

  // ── State ──────────────────────────────────────────────────────────────────
  const [storeOpen, setStoreOpen] = useState(false);
  const [workTypeOpen, setWorkTypeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Available stores scoped to user
  const availableStores: Store[] = user.stores;

  // Service norms for the selected store's object_format
  const [norms, setNorms] = useState<ServiceNorm[]>([]);
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage | null>(null);
  const [hasBudgetLimit, setHasBudgetLimit] = useState<boolean | null>(null);
  const [loadingNorms, setLoadingNorms] = useState(false);
  const [loadingBudget, setLoadingBudget] = useState(false);

  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT";

  // ── Form ───────────────────────────────────────────────────────────────────
  const schema = useMemo(() => buildSchema(role, (k) => tV(k as Parameters<typeof tV>[0])), [role, tV]);

  const defaultStoreId = isDirector && availableStores.length === 1
    ? availableStores[0].id
    : undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      store_id: defaultStoreId,
      requested_hours: 4,
      comment: "",
    },
  });

  const watchedStoreId = form.watch("store_id");
  const watchedDate = form.watch("planned_date");
  const watchedHours = form.watch("requested_hours");
  const watchedWorkTypeId = form.watch("work_type_id");

  const selectedStore = availableStores.find((s) => s.id === watchedStoreId);
  const { urgent, retroactive } = deriveFlags(watchedDate);
  const directorTooEarly = isDirector && isTooEarlyForDirector(watchedDate);

  // ── Load norms when store changes ──────────────────────────────────────────
  useEffect(() => {
    if (!watchedStoreId) return;
    const store = availableStores.find((s) => s.id === watchedStoreId);
    if (!store?.object_format) return;

    setLoadingNorms(true);
    getServiceNorms({ object_format: store.object_format, page_size: 50 })
      .then((res) => setNorms(res.data))
      .catch(() => setNorms([]))
      .finally(() => setLoadingNorms(false));
  }, [watchedStoreId, availableStores]);

  // ── Load budget when store changes ─────────────────────────────────────────
  useEffect(() => {
    if (!watchedStoreId) return;

    setLoadingBudget(true);
    Promise.all([
      getBudgetUsage({ store_ids: [watchedStoreId], period: "MONTH" }),
      getBudgetLimits({ store_id: watchedStoreId }),
    ])
      .then(([usageRes, limitsRes]) => {
        setBudgetUsage(usageRes.data[0] ?? null);
        setHasBudgetLimit(limitsRes.data.length > 0);
      })
      .catch(() => {
        setBudgetUsage(null);
        setHasBudgetLimit(false);
      })
      .finally(() => setLoadingBudget(false));
  }, [watchedStoreId]);

  // Initial load flag
  useEffect(() => {
    setLoadingData(false);
  }, []);

  // ── Work types derived from norms ──────────────────────────────────────────
  const workTypeOptions = useMemo(() => {
    const seen = new Set<number>();
    return norms
      .filter((n) => {
        if (seen.has(n.work_type_id)) return false;
        seen.add(n.work_type_id);
        return true;
      })
      .map((n) => ({ id: n.work_type_id, name: n.work_type_name }));
  }, [norms]);

  // ── Cost preview ───────────────────────────────────────────────────────────
  const selectedNorm = norms.find((n) => n.work_type_id === watchedWorkTypeId);
  const hourlyRate = selectedNorm?.hourly_rate ?? null;
  const estimatedCost =
    hourlyRate != null && watchedHours > 0 ? watchedHours * hourlyRate : null;

  // ── Budget usage display ───────────────────────────────────────────────────
  const budgetPct = budgetUsage
    ? Math.min(100, Math.round((budgetUsage.actual_amount / budgetUsage.limit_amount) * 100))
    : null;

  const budgetTrackColor =
    budgetPct == null
      ? ""
      : budgetPct >= 100
      ? "[&>[data-slot=progress-indicator]]:bg-destructive"
      : budgetPct >= 80
      ? "[&>[data-slot=progress-indicator]]:bg-yellow-500"
      : "";

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    if (directorTooEarly) return;

    setIsSubmitting(true);
    try {
      const result = await createFreelanceApplication({
        store_id: values.store_id,
        planned_date: format(values.planned_date, "yyyy-MM-dd"),
        requested_hours: values.requested_hours,
        work_type_id: values.work_type_id,
        comment: values.comment || undefined,
        urgent,
        retroactive,
        creator_role: role,
      });

      if (!result.success) {
        toast.error(t("toasts.error"));
        return;
      }

      if (retroactive) {
        toast.success(t("toasts.retroactive"));
      } else {
        toast.success(t("toasts.submitted"));
      }

      if (result.id) {
        router.push(ADMIN_ROUTES.freelanceApplicationDetail(result.id));
      } else {
        router.push(ADMIN_ROUTES.freelanceApplications);
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Module disabled guard ──────────────────────────────────────────────────
  if (!moduleEnabled) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
        {t("module_disabled")}
      </div>
    );
  }

  const submitDisabled =
    isSubmitting ||
    !form.formState.isValid ||
    directorTooEarly ||
    loadingData;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          { label: t("breadcrumbs.freelance"), href: ADMIN_ROUTES.freelanceDashboard },
          { label: t("breadcrumbs.applications"), href: ADMIN_ROUTES.freelanceApplications },
          { label: t("breadcrumbs.new") },
        ]}
      />

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>

                {/* ── 1. Store / Object ── */}
                <FormField
                  control={form.control}
                  name="store_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-medium">
                        {t("form.store_label")}{" "}
                        <span className="text-destructive" aria-hidden="true">*</span>
                      </FormLabel>
                      {isDirector ? (
                        /* Locked for STORE_DIRECTOR */
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                          {selectedStore?.name ?? t("form.store_placeholder")}
                        </div>
                      ) : (
                        <Popover open={storeOpen} onOpenChange={setStoreOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={storeOpen}
                                className={cn(
                                  "w-full justify-between font-normal min-h-[44px]",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <span className="truncate">
                                  {selectedStore?.name ?? t("form.store_placeholder")}
                                </span>
                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder={t("form.store_search_placeholder")} />
                              <CommandList>
                                <CommandEmpty>{t("form.store_empty")}</CommandEmpty>
                                <CommandGroup>
                                  {availableStores.map((store) => (
                                    <CommandItem
                                      key={store.id}
                                      value={store.name}
                                      onSelect={() => {
                                        field.onChange(store.id);
                                        form.setValue("work_type_id", undefined as unknown as number);
                                        setStoreOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 size-4",
                                          field.value === store.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="flex flex-col">
                                        <span>{store.name}</span>
                                        <span className="text-xs text-muted-foreground">{store.city}</span>
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── 2. Planned Date ── */}
                <FormField
                  control={form.control}
                  name="planned_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-medium">
                        {t("form.date_label")}{" "}
                        <span className="text-destructive" aria-hidden="true">*</span>
                      </FormLabel>
                      {/* Mobile native input fallback */}
                      <div className="md:hidden">
                        <FormControl>
                          <Input
                            type="date"
                            min={isDirector ? format(addDays(today(), 3), "yyyy-MM-dd") : undefined}
                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                field.onChange(new Date(e.target.value + "T00:00:00"));
                              }
                            }}
                            className="h-11"
                          />
                        </FormControl>
                      </div>
                      {/* Desktop calendar popover */}
                      <div className="hidden md:block">
                        <Popover open={dateOpen} onOpenChange={setDateOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal min-h-[44px]",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 size-4 shrink-0" />
                                {field.value
                                  ? format(field.value, "d MMMM yyyy", { locale: ru })
                                  : t("form.date_placeholder")}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(d) => {
                                field.onChange(d);
                                setDateOpen(false);
                              }}
                              disabled={
                                isDirector
                                  ? (date) => isBefore(startOfDay(date), addDays(today(), 3))
                                  : undefined
                              }
                              initialFocus
                              locale={ru}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── 3. Requested Hours ── */}
                <FormField
                  control={form.control}
                  name="requested_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        {t("form.hours_label")}{" "}
                        <span className="text-destructive" aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.5}
                          max={24}
                          step={0.5}
                          className="h-11"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── 4. Work Type ── */}
                <FormField
                  control={form.control}
                  name="work_type_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-medium">
                        {t("form.work_type_label")}{" "}
                        <span className="text-destructive" aria-hidden="true">*</span>
                      </FormLabel>
                      <Popover open={workTypeOpen} onOpenChange={setWorkTypeOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={workTypeOpen}
                              disabled={!watchedStoreId || loadingNorms}
                              className={cn(
                                "w-full justify-between font-normal min-h-[44px]",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate">
                                {loadingNorms ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="size-4 animate-spin" />
                                    {tCommon("loading")}
                                  </span>
                                ) : field.value ? (
                                  workTypeOptions.find((w) => w.id === field.value)?.name ?? t("form.work_type_placeholder")
                                ) : (
                                  t("form.work_type_placeholder")
                                )}
                              </span>
                              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder={t("form.work_type_search_placeholder")} />
                            <CommandList>
                              <CommandEmpty>{t("form.work_type_empty")}</CommandEmpty>
                              <CommandGroup>
                                {workTypeOptions.map((wt) => (
                                  <CommandItem
                                    key={wt.id}
                                    value={wt.name}
                                    onSelect={() => {
                                      field.onChange(wt.id);
                                      setWorkTypeOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 size-4",
                                        field.value === wt.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {wt.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── 5. Comment ── */}
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-muted-foreground">
                        {t("form.comment_label")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t("form.comment_placeholder")}
                          maxLength={500}
                          rows={3}
                          className="resize-none"
                        />
                      </FormControl>
                      <div className="flex justify-end">
                        <span className="text-xs text-muted-foreground">
                          {(field.value ?? "").length}/500
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── Alerts ── */}

                {/* STORE_DIRECTOR: date too early — blocking destructive */}
                {isDirector && directorTooEarly && watchedDate && (
                  <Alert variant="destructive" role="alert">
                    <AlertCircle className="size-4" />
                    <AlertTitle>{t("alerts.store_director_too_early_title")}</AlertTitle>
                    <AlertDescription>{t("alerts.store_director_too_early_desc")}</AlertDescription>
                  </Alert>
                )}

                {/* SUPERVISOR+: retroactive */}
                {isSupervisorPlus && retroactive && watchedDate && (
                  <Alert role="alert">
                    <History className="size-4" />
                    <AlertTitle>{t("alerts.retroactive_title")}</AlertTitle>
                    <AlertDescription>
                      {t("alerts.retroactive_desc")}
                    </AlertDescription>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Checkbox id="retro-check" checked readOnly aria-readonly="true" />
                      <label htmlFor="retro-check" className="cursor-default select-none">
                        {t("form.retroactive_label")}
                      </label>
                    </div>
                  </Alert>
                )}

                {/* SUPERVISOR+: urgent (but not retroactive) */}
                {isSupervisorPlus && urgent && !retroactive && watchedDate && (
                  <Alert role="alert">
                    <Clock className="size-4" />
                    <AlertTitle>{t("alerts.urgent_title")}</AlertTitle>
                    <AlertDescription>{t("alerts.urgent_desc")}</AlertDescription>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Checkbox id="urgent-check" checked readOnly aria-readonly="true" />
                      <label htmlFor="urgent-check" className="cursor-default select-none">
                        {t("form.urgent_label")}
                      </label>
                    </div>
                  </Alert>
                )}

                {/* No budget limits */}
                {watchedStoreId && hasBudgetLimit === false && !loadingBudget && (
                  <Alert variant="destructive" role="alert">
                    <AlertCircle className="size-4" />
                    <AlertTitle>{t("alerts.no_budget_title")}</AlertTitle>
                    <AlertDescription>
                      {t("alerts.no_budget_desc")}{" "}
                      <a
                        href={ADMIN_ROUTES.freelanceBudgetLimits}
                        className="underline font-medium"
                      >
                        {t("alerts.no_budget_link")}
                      </a>
                    </AlertDescription>
                  </Alert>
                )}

                {/* ── Cost & Budget Preview ── */}
                {(estimatedCost != null || budgetUsage != null) && (
                  <>
                    <Separator />
                    <Card className="bg-muted/40">
                      <CardHeader className="pb-3 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <TrendingUp className="size-4 text-muted-foreground" />
                          {t("cost_section.title")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        {/* Cost formula */}
                        {hourlyRate != null && estimatedCost != null ? (
                          <div className="text-sm">
                            <span className="font-medium tabular-nums">
                              {t("cost_section.formula", {
                                hours: watchedHours,
                                rate: hourlyRate.toLocaleString("ru"),
                                total: estimatedCost.toLocaleString("ru"),
                              })}
                            </span>
                            {isClientDirect && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({t("cost_section.client_direct_hint")})
                              </span>
                            )}
                          </div>
                        ) : watchedWorkTypeId && !loadingNorms ? (
                          <p className="text-xs text-muted-foreground">{t("cost_section.no_norms")}</p>
                        ) : null}

                        {/* Budget usage progress */}
                        {loadingBudget ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            {tCommon("loading")}
                          </div>
                        ) : budgetUsage != null && budgetPct != null ? (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground">
                              {t("cost_section.budget_month_label")}
                            </p>
                            <Progress
                              value={budgetPct}
                              className={cn("h-2", budgetTrackColor)}
                              aria-label={`${budgetPct}%`}
                            />
                            <p className="text-xs text-muted-foreground">
                              {t("cost_section.budget_usage", {
                                spent: budgetUsage.actual_amount.toLocaleString("ru"),
                                limit: budgetUsage.limit_amount.toLocaleString("ru"),
                                pct: budgetPct,
                              })}
                            </p>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* ── Actions — sticky on mobile ── */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:static sticky bottom-0 bg-background pt-3 pb-safe border-t border-border md:border-0 md:pt-0 md:pb-0 md:bg-transparent -mx-6 px-6 md:mx-0 md:px-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(ADMIN_ROUTES.freelanceApplications)}
                    className="min-h-[44px] sm:min-h-0"
                  >
                    {t("form.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitDisabled}
                    className="min-h-[44px] sm:min-h-0"
                  >
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                    {t("form.submit")}
                  </Button>
                </div>

              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
