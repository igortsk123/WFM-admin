"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Lock, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { PageHeader } from "@/components/shared";
import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { createTask, updateTask } from "@/lib/api/tasks";
import { getStores } from "@/lib/api/stores";
import { getZones, getWorkTypes, getProductCategories } from "@/lib/api/taxonomy";
import { getUsers } from "@/lib/api/users";
import { getGoals } from "@/lib/api/goals";
import { getDataConnectors } from "@/lib/api/data-connectors";

import type { Permission, AcceptancePolicy, TaskType } from "@/lib/types";
import type { TaskDetail } from "@/lib/api/tasks";

import {
  TaskFormSchema,
  TASK_TEMPLATES,
  buildDateTimeString,
} from "./task-form/_shared";
import type {
  TaskFormValues,
  FormData,
  TaskTemplate,
} from "./task-form/_shared";
import { TaskFormGeneralSection } from "./task-form/section-general";
import { TaskFormLocationSection } from "./task-form/section-location";
import { TaskFormWorkSection } from "./task-form/section-work";
import { TaskFormWhoSection } from "./task-form/section-who";
import { TaskFormWhenSection } from "./task-form/section-when";
import { TaskFormControlSection } from "./task-form/section-control";
import {
  TaskFormTemplatesCard,
  TaskFormSummarySidebar,
  TaskFormMobileSummarySidebar,
} from "./task-form/sidebar";
import { TaskFormFooter } from "./task-form/footer";

// ─── Props ──────────────────────────────────────────────────────────

export interface TaskFormProps {
  mode: "create" | "edit";
  taskId?: string;
  initialTask?: TaskDetail;
}

// ─── Main Component ─────────────────────────────────────────────────

export function TaskForm({ mode, taskId, initialTask }: TaskFormProps) {
  const t = useTranslations("screen.taskForm");
  const tCommon = useTranslations("common");
  const tPermission = useTranslations("permission");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // ─── 403 guard ───────────────────────────────────────────────────
  const canCreate =
    user.role === "SUPERVISOR" ||
    user.role === "REGIONAL" ||
    user.role === "NETWORK_OPS";

  const isFashion = user.organization.business_vertical === "FASHION_RETAIL";

  // Авто-подстановка магазина из URL (`/tasks/new?store_id=N`)
  const prefilledStoreId = mode === "create" ? searchParams.get("store_id") : null;

  // ─── Form data state ─────────────────────────────────────────────
  const [formData, setFormData] = useState<FormData>({
    stores: [],
    zones: [],
    workTypes: [],
    productCategories: [],
    workers: [],
    activeGoals: [],
    marketingChannels: [],
  });
  const [loadError, setLoadError] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // ─── Submit state ────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // ─── Form ────────────────────────────────────────────────────────
  const defaultValues: Partial<TaskFormValues> = {
    type: "PLANNED",
    store_id: prefilledStoreId ?? undefined,
    assignment_type: "specific",
    is_chain: false,
    next_assignment_type: "specific",
    planned_minutes: 30,
    acceptance_policy: "MANUAL",
    requires_photo: false,
    override_enabled: false,
  };

  const form = useForm<TaskFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(TaskFormSchema) as any,
    defaultValues,
  });

  const {
    watch,
    setValue,
    formState: { isDirty },
  } = form;

  const watchedStoreId = watch("store_id");
  const watchedWorkTypeId = watch("work_type_id");
  const watchedAssignmentType = watch("assignment_type");
  const watchedIsChain = watch("is_chain");
  const watchedNextAssignmentType = watch("next_assignment_type");
  const watchedRequiresPhoto = watch("requires_photo");

  // Live summary watches
  const watchedZoneId = watch("zone_id");
  const watchedAssigneeId = watch("assignee_id");
  const watchedPermission = watch("assigned_to_permission");
  const watchedPlannedMinutes = watch("planned_minutes");
  const watchedScheduledDate = watch("scheduled_at_date");
  const watchedScheduledTime = watch("scheduled_at_time");
  const watchedDueDate = watch("due_at_date");
  const watchedDueTime = watch("due_at_time");
  const watchedPolicy = watch("acceptance_policy");
  const watchedPhoto = watch("requires_photo");

  // ─── Load initial data ───────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      setLoadingData(true);
      setLoadError(false);
      try {
        const [storesRes, workTypesRes, categoriesRes, usersRes, goalsRes, connectorsRes] =
          await Promise.all([
            getStores({ page_size: 100 }),
            getWorkTypes({ page_size: 100 }),
            getProductCategories(),
            getUsers({ page_size: 200 }),
            getGoals({ status: "ACTIVE" }),
            getDataConnectors(),
          ]);

        setFormData({
          stores: storesRes.data,
          zones: [],
          workTypes: workTypesRes.data,
          productCategories: categoriesRes.data,
          workers: usersRes.data.filter((u) => u.type === "STAFF"),
          activeGoals: goalsRes.data,
          marketingChannels: connectorsRes.data.filter(
            (c) => c.type === "MARKETING_CHANNEL" && c.status === "ACTIVE"
          ),
        });
      } catch {
        setLoadError(true);
      } finally {
        setLoadingData(false);
      }
    }
    loadAll();
  }, []);

  // ─── Load zones when store changes ───────────────────────────────
  useEffect(() => {
    if (!watchedStoreId) {
      setFormData((prev) => ({ ...prev, zones: [] }));
      setValue("zone_id", "");
      return;
    }
    getZones({ store_id: parseInt(watchedStoreId), page_size: 100 }).then((res) => {
      const approved = res.data.filter((z) => z.approved);
      setFormData((prev) => ({ ...prev, zones: approved }));
      setValue("zone_id", "");
    });
  }, [watchedStoreId, setValue]);

  // ─── Auto-fill work type defaults ────────────────────────────────
  useEffect(() => {
    if (!watchedWorkTypeId) return;
    const wt = formData.workTypes.find((w) => String(w.id) === watchedWorkTypeId);
    if (!wt) return;
    if (mode === "create") {
      setValue("planned_minutes", wt.default_duration_min);
      setValue("requires_photo", wt.requires_photo_default);
      setValue("acceptance_policy", wt.acceptance_policy_default);
    }
  }, [watchedWorkTypeId, formData.workTypes, mode, setValue]);

  // ─── Populate edit values ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== "edit" || !initialTask) return;
    const it = initialTask;
    form.reset({
      title: it.title,
      description: it.description,
      type: it.type,
      store_id: String(it.store_id),
      zone_id: String(it.zone_id),
      work_type_id: String(it.work_type_id),
      product_category_id: it.product_category_id ? String(it.product_category_id) : undefined,
      assignment_type: it.assignee_id ? "specific" : "permission",
      assignee_id: it.assignee_id ? String(it.assignee_id) : undefined,
      assigned_to_permission: it.assigned_to_permission ?? undefined,
      is_chain: it.kind === "CHAIN",
      next_assignment_type: it.next_assignee_id ? "specific" : "permission",
      next_assignee_id: it.next_assignee_id ? String(it.next_assignee_id) : undefined,
      planned_minutes: it.planned_minutes,
      acceptance_policy: it.acceptance_policy,
      requires_photo: it.requires_photo,
      override_enabled: it.requires_photo_override ?? false,
      manager_comment: it.comment ?? undefined,
      marketing_channel_id: it.marketing_channel_target ?? undefined,
    });
  }, [mode, initialTask, form]);

  // ─── Submit handler ───────────────────────────────────────────────
  const onSubmit = useCallback(
    async (values: TaskFormValues, addAnother = false) => {
      setIsSubmitting(true);
      try {
        const payload = {
          title: values.title,
          description: values.description ?? "",
          type: values.type as TaskType,
          kind: values.is_chain ? ("CHAIN" as const) : ("SINGLE" as const),
          source: "MANAGER" as const,
          store_id: parseInt(values.store_id),
          zone_id: parseInt(values.zone_id),
          work_type_id: parseInt(values.work_type_id),
          product_category_id: values.product_category_id
            ? parseInt(values.product_category_id)
            : null,
          assignee_id:
            values.assignment_type === "specific" && values.assignee_id
              ? parseInt(values.assignee_id)
              : null,
          assigned_to_permission:
            values.assignment_type === "permission"
              ? (values.assigned_to_permission as Permission)
              : null,
          next_assignee_id:
            values.is_chain &&
            values.next_assignment_type === "specific" &&
            values.next_assignee_id
              ? parseInt(values.next_assignee_id)
              : null,
          planned_minutes: values.planned_minutes,
          acceptance_policy: values.acceptance_policy as AcceptancePolicy,
          requires_photo: values.requires_photo,
          requires_photo_override: values.override_enabled,
          comment: values.manager_comment,
          marketing_channel_target: values.marketing_channel_id || null,
          time_start: buildDateTimeString(values.scheduled_at_date, values.scheduled_at_time),
          time_end: buildDateTimeString(values.due_at_date, values.due_at_time),
          archived: false,
          state: "NEW" as const,
          review_state: "NONE" as const,
          store_name: formData.stores.find((s) => String(s.id) === values.store_id)?.name ?? "",
          zone_name: formData.zones.find((z) => String(z.id) === values.zone_id)?.name ?? "",
          work_type_name:
            formData.workTypes.find((w) => String(w.id) === values.work_type_id)?.name ?? "",
          creator_id: user.id,
          creator_name: `${user.last_name} ${user.first_name}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (mode === "create") {
          const res = await createTask(payload);
          if (!res.success) {
            if (res.error?.code === "CONFLICT") {
              toast.error(t("toast_conflict"));
              return;
            }
            toast.error(t("toast_error"));
            return;
          }
          toast.success(t("toast_created"));
          if (addAnother) {
            form.reset({
              ...defaultValues,
              store_id: values.store_id,
              zone_id: values.zone_id,
              work_type_id: values.work_type_id,
            });
          } else {
            router.push(ADMIN_ROUTES.tasks);
          }
        } else if (mode === "edit" && taskId) {
          const res = await updateTask(taskId, payload);
          if (!res.success) {
            if (res.error?.code === "CONFLICT") {
              toast.error(t("toast_conflict"));
              return;
            }
            toast.error(t("toast_error"));
            return;
          }
          toast.success(t("toast_updated"));
          router.push(ADMIN_ROUTES.taskDetail(taskId));
        }
      } catch {
        toast.error(t("toast_error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode, taskId, form, router, formData, user, t, defaultValues]
  );

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      router.back();
    }
  }, [isDirty, router]);

  // ─── Computed options ─────────────────────────────────────────────
  const storeOptions = formData.stores.map((s) => ({
    value: String(s.id),
    label: s.name,
    hint: s.city,
  }));

  const zoneOptions = formData.zones.map((z) => ({
    value: String(z.id),
    label: z.name,
  }));

  const workTypeOptions = formData.workTypes.map((wt) => ({
    value: String(wt.id),
    label: wt.name,
    hint: `${wt.default_duration_min} мин`,
  }));

  const categoryOptions = formData.productCategories.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const workerOptions = formData.workers.map((u) => ({
    value: String(u.id),
    label: `${u.last_name} ${u.first_name}`,
  }));

  const permissionOptions: { value: Permission; label: string }[] = [
    { value: "CASHIER", label: tPermission("CASHIER") },
    { value: "SALES_FLOOR", label: tPermission("SALES_FLOOR") },
    { value: "SELF_CHECKOUT", label: tPermission("SELF_CHECKOUT") },
    { value: "WAREHOUSE", label: tPermission("WAREHOUSE") },
    { value: "PRODUCTION_LINE", label: tPermission("PRODUCTION_LINE") },
  ];

  const marketingChannelOptions = formData.marketingChannels.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const hasActiveGoal = formData.activeGoals.length > 0;

  // ─── Selected labels for summary ─────────────────────────────────
  const selectedStore = formData.stores.find((s) => String(s.id) === watchedStoreId);
  const selectedZone = formData.zones.find((z) => String(z.id) === watchedZoneId);
  const selectedWorkType = formData.workTypes.find((w) => String(w.id) === watchedWorkTypeId);
  const selectedAssignee = formData.workers.find((u) => String(u.id) === watchedAssigneeId);
  const selectedPermissionLabel = watchedPermission
    ? permissionOptions.find((p) => p.value === watchedPermission)?.label
    : undefined;

  const summaryAssignee =
    watchedAssignmentType === "specific"
      ? selectedAssignee
        ? `${selectedAssignee.last_name} ${selectedAssignee.first_name}`
        : t("summary_not_set")
      : selectedPermissionLabel ?? t("summary_not_set");

  // ─── Templates ───────────────────────────────────────────────────
  const applyTemplate = (tpl: TaskTemplate) => {
    if (tpl.work_type_id) setValue("work_type_id", tpl.work_type_id);
    setValue("planned_minutes", tpl.planned_minutes);
    setValue("requires_photo", tpl.requires_photo);
    setValue("acceptance_policy", tpl.acceptance_policy);
    if (tpl.description) setValue("description", tpl.description);
  };

  // ─── 403 screen ───────────────────────────────────────────────────
  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="rounded-full bg-muted p-4">
            <Lock className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{t("forbidden_title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("forbidden_desc")}</p>
          <Button
            variant="outline"
            onClick={() => router.push(ADMIN_ROUTES.tasks)}
            className="mt-2"
          >
            {t("forbidden_back")}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Breadcrumbs ───────────────────────────────────────────────────
  const breadcrumbs = [
    { label: t("breadcrumb_home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumb_tasks"), href: ADMIN_ROUTES.tasks },
    {
      label:
        mode === "edit" && initialTask
          ? `${t("breadcrumb_edit")}: ${initialTask.title}`
          : t("breadcrumb_new"),
    },
  ];

  const pageTitle =
    mode === "edit" && initialTask
      ? t("title_edit", { title: initialTask.title })
      : t("title_create");

  // ─── Loading / error states for form data ─────────────────────────
  if (loadError) {
    return (
      <div className="space-y-4">
        <PageHeader title={pageTitle} breadcrumbs={breadcrumbs} />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("error_load")}</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const summaryProps = {
    selectedStore,
    selectedZone,
    selectedWorkType,
    summaryAssignee,
    watchedPlannedMinutes,
    watchedScheduledDate,
    watchedScheduledTime,
    watchedDueDate,
    watchedDueTime,
    watchedPolicy,
    watchedPhoto,
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <PageHeader title={pageTitle} breadcrumbs={breadcrumbs} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => onSubmit(v, false))} noValidate>
            {/* Two-column layout: main col-span-2 + sidebar col-span-1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* ── MAIN: 6 sections ─────────────────────────── */}
              <div className="lg:col-span-2 space-y-6">
                <TaskFormGeneralSection
                  loadingData={loadingData}
                  hasActiveGoal={hasActiveGoal}
                />

                <TaskFormLocationSection
                  loadingData={loadingData}
                  storeOptions={storeOptions}
                  zoneOptions={zoneOptions}
                  watchedStoreId={watchedStoreId}
                />

                <TaskFormWorkSection
                  loadingData={loadingData}
                  workTypeOptions={workTypeOptions}
                  categoryOptions={categoryOptions}
                  watchedWorkTypeId={watchedWorkTypeId}
                  selectedWorkType={selectedWorkType}
                />

                <TaskFormWhoSection
                  loadingData={loadingData}
                  workerOptions={workerOptions}
                  permissionOptions={permissionOptions}
                  watchedAssignmentType={watchedAssignmentType}
                  watchedIsChain={watchedIsChain}
                  watchedNextAssignmentType={watchedNextAssignmentType}
                />

                <TaskFormWhenSection loadingData={loadingData} />

                <TaskFormControlSection
                  loadingData={loadingData}
                  isFashion={isFashion}
                  watchedRequiresPhoto={watchedRequiresPhoto}
                  marketingChannelOptions={marketingChannelOptions}
                />

                {/* Mobile: Sidebar cards appear here on <md */}
                <div className="lg:hidden space-y-6">
                  <TaskFormMobileSummarySidebar {...summaryProps} />
                  <TaskFormTemplatesCard
                    templates={TASK_TEMPLATES}
                    applyTemplate={applyTemplate}
                  />
                </div>
              </div>

              {/* ── SIDEBAR (desktop only) ───────────────────────── */}
              <div className="hidden lg:flex flex-col gap-6 lg:sticky lg:top-20">
                <TaskFormTemplatesCard
                  templates={TASK_TEMPLATES}
                  applyTemplate={applyTemplate}
                />
                <TaskFormSummarySidebar {...summaryProps} />
              </div>
            </div>

            <TaskFormFooter
              mode={mode}
              isSubmitting={isSubmitting}
              showCancelConfirm={showCancelConfirm}
              setShowCancelConfirm={setShowCancelConfirm}
              handleCancel={handleCancel}
              handleSaveAndAddAnother={form.handleSubmit((v) => onSubmit(v, true))}
              onConfirmCancel={() => router.back()}
            />
          </form>
      </Form>
    </div>
  );
}
