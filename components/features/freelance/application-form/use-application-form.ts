"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { createFreelanceApplication } from "@/lib/api/freelance-applications";
import { getServiceNorms } from "@/lib/api/freelance-norms";
import { getBudgetLimits, getBudgetUsage } from "@/lib/api/freelance-budget";
import type { BudgetUsage, ServiceNorm, Store } from "@/lib/types/index";

import {
  buildSchema,
  deriveFlags,
  isSupervisorOrAbove,
  isTooEarlyForDirector,
  type AllowedRole,
  type FormValues,
  type WorkTypeOption,
} from "./_shared";

export interface UseApplicationFormResult {
  // Role / org flags
  role: AllowedRole;
  isDirector: boolean;
  isSupervisorPlus: boolean;
  isClientDirect: boolean;
  moduleEnabled: boolean;

  // Form
  form: UseFormReturn<FormValues>;
  onSubmit: (values: FormValues) => Promise<void>;

  // Stores
  availableStores: Store[];
  selectedStore: Store | undefined;

  // Norms / work types
  norms: ServiceNorm[];
  workTypeOptions: WorkTypeOption[];
  loadingNorms: boolean;

  // Budget
  budgetUsage: BudgetUsage | null;
  hasBudgetLimit: boolean | null;
  loadingBudget: boolean;
  budgetPct: number | null;
  budgetTrackColor: string;

  // Cost preview
  hourlyRate: number | null;
  estimatedCost: number | null;

  // Watched values
  watchedStoreId: number | undefined;
  watchedDate: Date | undefined;
  watchedHours: number;
  watchedWorkTypeId: number | undefined;

  // Derived flags
  urgent: boolean;
  retroactive: boolean;
  directorTooEarly: boolean;

  // UI state
  isSubmitting: boolean;
  loadingData: boolean;
  submitDisabled: boolean;

  // Cancel
  onCancel: () => void;
}

export function useApplicationForm(): UseApplicationFormResult {
  const t = useTranslations("screen.freelanceApplicationNew");
  const tV = useTranslations("screen.freelanceApplicationNew.validation");
  const router = useRouter();
  const { user } = useAuth();

  const role = user.role as AllowedRole;
  const isDirector = role === "STORE_DIRECTOR";
  const isSupervisorPlus = isSupervisorOrAbove(role);
  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT";
  const moduleEnabled = user.organization.freelance_module_enabled;

  // ── State ──────────────────────────────────────────────────────────────────
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

  // ── Form ───────────────────────────────────────────────────────────────────
  const schema = useMemo(
    () => buildSchema(role, (k) => tV(k as Parameters<typeof tV>[0])),
    [role, tV]
  );

  const defaultStoreId =
    isDirector && availableStores.length === 1
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
  const workTypeOptions: WorkTypeOption[] = useMemo(() => {
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
    ? Math.min(
        100,
        Math.round((budgetUsage.actual_amount / budgetUsage.limit_amount) * 100)
      )
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

  function onCancel() {
    router.push(ADMIN_ROUTES.freelanceApplications);
  }

  const submitDisabled =
    isSubmitting || !form.formState.isValid || directorTooEarly || loadingData;

  return {
    role,
    isDirector,
    isSupervisorPlus,
    isClientDirect,
    moduleEnabled,

    form,
    onSubmit,

    availableStores,
    selectedStore,

    norms,
    workTypeOptions,
    loadingNorms,

    budgetUsage,
    hasBudgetLimit,
    loadingBudget,
    budgetPct,
    budgetTrackColor,

    hourlyRate,
    estimatedCost,

    watchedStoreId,
    watchedDate,
    watchedHours,
    watchedWorkTypeId,

    urgent,
    retroactive,
    directorTooEarly,

    isSubmitting,
    loadingData,
    submitDisabled,

    onCancel,
  };
}
