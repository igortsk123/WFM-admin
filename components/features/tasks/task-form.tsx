"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  ChevronRight,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Check, ChevronsUpDown } from "lucide-react";

import { PageHeader, ConfirmDialog } from "@/components/shared";
import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

import { createTask, updateTask, getTaskById } from "@/lib/api/tasks";
import { getStores } from "@/lib/api/stores";
import { getZones, getWorkTypes, getProductCategories } from "@/lib/api/taxonomy";
import { getUsers } from "@/lib/api/users";
import { getGoals } from "@/lib/api/goals";
import { getDataConnectors } from "@/lib/api/data-connectors";

import type {
  Store,
  Zone,
  WorkType,
  ProductCategory,
  User,
  Permission,
  AcceptancePolicy,
  TaskType,
  Goal,
  DataConnector,
} from "@/lib/types";
import type { TaskDetail } from "@/lib/api/tasks";

// ─── Zod schema ────────────────────────────────────────────────────

const TaskFormSchema = z
  .object({
    title: z.string().min(3, "Минимум 3 символа").max(120),
    description: z.string().max(1000).optional(),
    type: z.enum(["PLANNED", "ADDITIONAL", "BONUS"]),
    store_id: z.string().min(1, "Обязательное поле"),
    zone_id: z.string().min(1, "Обязательное поле"),
    work_type_id: z.string().min(1, "Обязательное поле"),
    product_category_id: z.string().optional(),
    assignment_type: z.enum(["specific", "permission"]),
    assignee_id: z.string().optional(),
    assigned_to_permission: z.string().optional(),
    is_chain: z.boolean(),
    next_assignment_type: z.enum(["specific", "permission"]).optional(),
    next_assignee_id: z.string().optional(),
    next_permission: z.string().optional(),
    planned_minutes: z.number().int().min(1).max(960),
    scheduled_at_date: z.date().optional(),
    scheduled_at_time: z.string().optional(),
    due_at_date: z.date().optional(),
    due_at_time: z.string().optional(),
    acceptance_policy: z.enum(["AUTO", "MANUAL"]),
    requires_photo: z.boolean(),
    override_enabled: z.boolean(),
    override_justification: z.string().optional(),
    manager_comment: z.string().optional(),
    marketing_channel_id: z.string().optional(),
  })
  .refine(
    (d) => !(d.assignment_type === "specific" && !d.assignee_id),
    { message: "Выберите исполнителя", path: ["assignee_id"] }
  )
  .refine(
    (d) => !(d.assignment_type === "permission" && !d.assigned_to_permission),
    { message: "Выберите привилегию", path: ["assigned_to_permission"] }
  )
  .refine(
    (d) => !(d.is_chain && d.next_assignment_type === "specific" && !d.next_assignee_id),
    { message: "Выберите следующего исполнителя", path: ["next_assignee_id"] }
  )
  .refine(
    (d) => !(d.is_chain && d.next_assignment_type === "permission" && !d.next_permission),
    { message: "Выберите привилегию", path: ["next_permission"] }
  )
  .refine(
    (d) => !(d.override_enabled && (!d.override_justification || d.override_justification.length < 10)),
    { message: "Минимум 10 символов", path: ["override_justification"] }
  )
  .refine(
    (d) => !(d.scheduled_at_date && d.due_at_date && d.due_at_date < d.scheduled_at_date),
    { message: "Дедлайн должен быть позже запланированного времени", path: ["due_at_date"] }
  );

// Keep as function for consistency but return constant
function buildSchema() {
  return TaskFormSchema;
}

type TaskFormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Form data types ────────────────────────────────────────────────

interface FormData {
  stores: Store[];
  zones: Zone[];
  workTypes: WorkType[];
  productCategories: ProductCategory[];
  workers: User[];
  activeGoals: Goal[];
  marketingChannels: DataConnector[];
}

// ─── Templates ──────────────────────────────────────────────────────

interface TaskTemplate {
  key: string;
  work_type_id?: string;
  planned_minutes: number;
  requires_photo: boolean;
  acceptance_policy: AcceptancePolicy;
  description?: string;
}

// ─── Props ──────────────────────────────────────────────────────────

export interface TaskFormProps {
  mode: "create" | "edit";
  taskId?: string;
  initialTask?: TaskDetail;
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildDateTimeString(date?: Date, time?: string): string | undefined {
  if (!date) return undefined;
  const d = format(date, "yyyy-MM-dd");
  const t = time || "00:00";
  return `${d}T${t}:00`;
}

function ComboboxField({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; hint?: string }[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-9",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? "Поиск..."} />
          <CommandList>
            <CommandEmpty>{emptyText ?? "Ничего не найдено"}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value === value ? "" : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.hint && (
                    <span className="ml-2 text-xs text-muted-foreground shrink-0">
                      {opt.hint}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DateTimeField({
  date,
  onDateChange,
  time,
  onTimeChange,
  placeholder,
  disabled,
}: {
  date?: Date;
  onDateChange: (d: Date | undefined) => void;
  time?: string;
  onTimeChange: (t: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "flex-1 justify-start font-normal h-9 text-left",
              !date && "text-muted-foreground"
            )}
          >
            {date ? format(date, "d MMM yyyy", { locale: ru }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              onDateChange(d);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={time ?? ""}
        onChange={(e) => onTimeChange(e.target.value)}
        disabled={disabled || !date}
        className="w-28 h-9"
      />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function TaskForm({ mode, taskId, initialTask }: TaskFormProps) {
  const t = useTranslations("screen.taskForm");
  const tCommon = useTranslations("common");
  const tPermission = useTranslations("permission");
  const router = useRouter();
  const { user } = useAuth();

  // ─── 403 guard ───────────────────────────────────────────────────
  const canCreate =
    user.role === "SUPERVISOR" ||
    user.role === "REGIONAL" ||
    user.role === "NETWORK_OPS";

  // Override access: NETWORK_OPS / REGIONAL can toggle; SUPERVISOR sees disabled
  const canOverride =
    user.role === "NETWORK_OPS" ||
    user.role === "REGIONAL" ||
    user.role === "OPERATOR";

  const isFashion = user.organization.business_vertical === "FASHION_RETAIL";

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

  // ─── Schema + form ───────────────────────────────────────────────
  const schema = buildSchema();

  const defaultValues: Partial<TaskFormValues> = {
    type: "PLANNED",
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
    resolver: zodResolver(schema) as any,
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
  const watchedOverride = watch("override_enabled");
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
    // Only auto-fill if not editing (or if field not already dirty)
    if (mode === "create") {
      setValue("planned_minutes", wt.default_duration_min);
      setValue("requires_photo", wt.requires_photo_default);
      setValue("acceptance_policy", wt.acceptance_policy_default);
    }
  }, [watchedWorkTypeId, formData.workTypes, mode, setValue]);

  // ─── Populate edit values ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== "edit" || !initialTask) return;
    const t = initialTask;
    form.reset({
      title: t.title,
      description: t.description,
      type: t.type,
      store_id: String(t.store_id),
      zone_id: String(t.zone_id),
      work_type_id: String(t.work_type_id),
      product_category_id: t.product_category_id ? String(t.product_category_id) : undefined,
      assignment_type: t.assignee_id ? "specific" : "permission",
      assignee_id: t.assignee_id ? String(t.assignee_id) : undefined,
      assigned_to_permission: t.assigned_to_permission ?? undefined,
      is_chain: t.kind === "CHAIN",
      next_assignment_type: t.next_assignee_id ? "specific" : "permission",
      next_assignee_id: t.next_assignee_id ? String(t.next_assignee_id) : undefined,
      planned_minutes: t.planned_minutes,
      acceptance_policy: t.acceptance_policy,
      requires_photo: t.requires_photo,
      override_enabled: t.requires_photo_override ?? false,
      manager_comment: t.comment ?? undefined,
      marketing_channel_id: t.marketing_channel_target ?? undefined,
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
          work_type_name: formData.workTypes.find((w) => String(w.id) === values.work_type_id)?.name ?? "",
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
  const templates: TaskTemplate[] = [
    {
      key: "merch",
      work_type_id: "4",
      planned_minutes: 30,
      requires_photo: true,
      acceptance_policy: "MANUAL",
      description: "Выкладка товара на полки согласно планограмме",
    },
    {
      key: "revaluation",
      work_type_id: "6",
      planned_minutes: 45,
      requires_photo: true,
      acceptance_policy: "MANUAL",
      description: "Обновление ценников по актуальному прайс-листу",
    },
    {
      key: "cashier_clean",
      work_type_id: "2",
      planned_minutes: 15,
      requires_photo: false,
      acceptance_policy: "AUTO",
      description: "Уборка и дезинфекция кассовой зоны",
    },
    {
      key: "receiving",
      work_type_id: "8",
      planned_minutes: 60,
      requires_photo: true,
      acceptance_policy: "MANUAL",
      description: "Приёмка и разгрузка товара от поставщика",
    },
    {
      key: "inventory",
      work_type_id: "9",
      planned_minutes: 90,
      requires_photo: false,
      acceptance_policy: "MANUAL",
      description: "Инвентаризация товаров бакалейного отдела",
    },
  ];

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

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <PageHeader title={pageTitle} breadcrumbs={breadcrumbs} />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => onSubmit(v, false))}
          noValidate
        >
          {/* Two-column layout: main col-span-2 + sidebar col-span-1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* ── MAIN: 6 sections ─────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Section 1: General */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("section_general")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("field_title")} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("field_title_placeholder")}
                            maxLength={120}
                            disabled={loadingData}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("field_description")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            placeholder={t("field_description_placeholder")}
                            rows={4}
                            maxLength={1000}
                            disabled={loadingData}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("field_type")}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={loadingData}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PLANNED">{t("type_planned")}</SelectItem>
                            <SelectItem value="ADDITIONAL">{t("type_additional")}</SelectItem>
                            <SelectItem
                              value="BONUS"
                              disabled={!hasActiveGoal}
                            >
                              {t("type_bonus")}
                              {!hasActiveGoal && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({t("type_bonus_hint")})
                                </span>
                              )}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Section 2: Where */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("section_location")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="store_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("field_store")} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <ComboboxField
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            options={storeOptions}
                            placeholder={t("field_store_placeholder")}
                            searchPlaceholder={t("search_placeholder")}
                            disabled={loadingData}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zone_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("field_zone")} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <ComboboxField
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            options={zoneOptions}
                            placeholder={
                              watchedStoreId
                                ? t("field_zone_placeholder")
                                : t("field_zone_disabled")
                            }
                            searchPlaceholder={t("search_placeholder")}
                            disabled={!watchedStoreId || loadingData}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Section 3: What */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("section_work")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="work_type_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("field_work_type")} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <ComboboxField
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            options={workTypeOptions}
                            placeholder={t("field_work_type_placeholder")}
                            searchPlaceholder={t("search_placeholder")}
                            disabled={loadingData}
                          />
                        </FormControl>
                        {watchedWorkTypeId && selectedWorkType && (
                          <p className="text-xs text-muted-foreground">
                            {t("field_work_type_duration_hint", {
                              min: selectedWorkType.default_duration_min,
                            })}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="product_category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("field_product_category")}</FormLabel>
                        <FormControl>
                          <ComboboxField
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            options={categoryOptions}
                            placeholder={t("field_product_category_placeholder")}
                            searchPlaceholder={t("search_placeholder")}
                            disabled={loadingData}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Section 4: Who */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("section_who")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assignment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("field_assignment_type")}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex flex-col gap-2 sm:flex-row"
                            disabled={loadingData}
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="specific" id="assign-specific" />
                              <Label htmlFor="assign-specific" className="font-normal cursor-pointer">
                                {t("assignment_specific")}
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="permission" id="assign-permission" />
                              <Label htmlFor="assign-permission" className="font-normal cursor-pointer">
                                {t("assignment_permission")}
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedAssignmentType === "specific" ? (
                    <FormField
                      control={form.control}
                      name="assignee_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("field_assignee")} <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <ComboboxField
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              options={workerOptions}
                              placeholder={t("field_assignee_placeholder")}
                              searchPlaceholder={t("field_assignee_placeholder")}
                              disabled={loadingData}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="assigned_to_permission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("field_permission")} <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <ComboboxField
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              options={permissionOptions.map((p) => ({
                                value: p.value,
                                label: p.label,
                              }))}
                              placeholder={t("field_permission_placeholder")}
                              searchPlaceholder={t("search_placeholder")}
                              disabled={loadingData}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            {t("assignment_permission_hint")}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Chain switch */}
                  <FormField
                    control={form.control}
                    name="is_chain"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-border p-3 gap-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium cursor-pointer">
                            {t("chain_label")}
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={loadingData}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {watchedIsChain && (
                    <div className="space-y-3 rounded-lg bg-muted/40 p-3 border border-border">
                      <p className="text-xs text-muted-foreground">{t("chain_hint")}</p>

                      <FormField
                        control={form.control}
                        name="next_assignment_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                value={field.value ?? "specific"}
                                onValueChange={field.onChange}
                                className="flex gap-4"
                              >
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="specific" id="next-specific" />
                                  <Label htmlFor="next-specific" className="font-normal cursor-pointer text-sm">
                                    {t("assignment_specific")}
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="permission" id="next-permission" />
                                  <Label htmlFor="next-permission" className="font-normal cursor-pointer text-sm">
                                    {t("assignment_permission")}
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {watchedNextAssignmentType === "specific" ? (
                        <FormField
                          control={form.control}
                          name="next_assignee_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">{t("field_next_assignee")}</FormLabel>
                              <FormControl>
                                <ComboboxField
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  options={workerOptions}
                                  placeholder={t("field_next_assignee_placeholder")}
                                  searchPlaceholder={t("search_placeholder")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="next_permission"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">{t("field_next_permission")}</FormLabel>
                              <FormControl>
                                <ComboboxField
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  options={permissionOptions.map((p) => ({
                                    value: p.value,
                                    label: p.label,
                                  }))}
                                  placeholder={t("field_permission_placeholder")}
                                  searchPlaceholder={t("search_placeholder")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 5: When */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("section_when")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="planned_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("field_planned_minutes")} <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={960}
                            className="w-32"
                            disabled={loadingData}
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                      control={form.control}
                      name="scheduled_at_date"
                      render={({ field: dateField, fieldState }) => (
                        <FormItem>
                          <FormLabel>{t("field_scheduled_at")}</FormLabel>
                          <FormControl>
                            <DateTimeField
                              date={dateField.value}
                              onDateChange={dateField.onChange}
                              time={watch("scheduled_at_time")}
                              onTimeChange={(v) => setValue("scheduled_at_time", v)}
                              placeholder={t("field_scheduled_at_placeholder")}
                              disabled={loadingData}
                            />
                          </FormControl>
                          {fieldState.error && (
                            <p className="text-[0.8rem] font-medium text-destructive">
                              {fieldState.error.message}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="due_at_date"
                      render={({ field: dateField, fieldState }) => (
                        <FormItem>
                          <FormLabel>{t("field_due_at")}</FormLabel>
                          <FormControl>
                            <DateTimeField
                              date={dateField.value}
                              onDateChange={dateField.onChange}
                              time={watch("due_at_time")}
                              onTimeChange={(v) => setValue("due_at_time", v)}
                              placeholder={t("field_due_at_placeholder")}
                              disabled={loadingData}
                            />
                          </FormControl>
                          {fieldState.error && (
                            <p className="text-[0.8rem] font-medium text-destructive">
                              {fieldState.error.message}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Section 6: Control */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("section_control")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="acceptance_policy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("field_acceptance_policy")}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={watchedOverride ? false : loadingData}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AUTO">{t("policy_auto")}</SelectItem>
                            <SelectItem value="MANUAL">{t("policy_manual")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requires_photo"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-border p-3 gap-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium cursor-pointer">
                            {t("field_requires_photo")}
                          </FormLabel>
                          {watchedRequiresPhoto && (
                            <p className="text-xs text-muted-foreground">
                              {t("requires_photo_hint")}
                            </p>
                          )}
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={loadingData}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Override block */}
                  <div className="rounded-lg border border-border">
                    <div className="flex items-center justify-between p-3 gap-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {t("override_label")}
                        </p>
                        {!canOverride && (
                          <p className="text-xs text-muted-foreground">
                            {t("override_hint_disabled")}
                          </p>
                        )}
                      </div>
                      {canOverride ? (
                        <FormField
                          control={form.control}
                          name="override_enabled"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Switch disabled checked={false} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-48">{t("override_hint_disabled")}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {watchedOverride && canOverride && (
                      <div className="px-3 pb-3">
                        <FormField
                          control={form.control}
                          name="override_justification"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                {t("override_justification")}
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder={t("override_justification_placeholder")}
                                  rows={2}
                                  className="resize-none text-sm"
                                  minLength={10}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="manager_comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("field_manager_comment")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            placeholder={t("field_manager_comment_placeholder")}
                            rows={2}
                            className="resize-none"
                            disabled={loadingData}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Fashion-only: Marketing channel */}
                  {isFashion && (
                    <FormField
                      control={form.control}
                      name="marketing_channel_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("field_marketing_channel")}</FormLabel>
                          <FormControl>
                            <ComboboxField
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              options={marketingChannelOptions}
                              placeholder={t("field_marketing_channel_placeholder")}
                              searchPlaceholder={t("search_placeholder")}
                              disabled={loadingData}
                            />
                          </FormControl>
                          {field.value && (
                            <p className="text-xs text-muted-foreground">
                              {t("marketing_channel_hint")}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Mobile: Sidebar cards appear here on <md */}
              <div className="lg:hidden space-y-6">
                <MobileSummarySidebar
                  t={t}
                  selectedStore={selectedStore}
                  selectedZone={selectedZone}
                  selectedWorkType={selectedWorkType}
                  summaryAssignee={summaryAssignee}
                  watchedPlannedMinutes={watchedPlannedMinutes}
                  watchedScheduledDate={watchedScheduledDate}
                  watchedScheduledTime={watchedScheduledTime}
                  watchedDueDate={watchedDueDate}
                  watchedDueTime={watchedDueTime}
                  watchedPolicy={watchedPolicy}
                  watchedPhoto={watchedPhoto}
                />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t("sidebar_templates")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="w-full text-left text-sm text-primary hover:underline py-1 block"
                      >
                        {t(`template_${tpl.key}` as Parameters<typeof t>[0])}
                      </button>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">{t("templates_hint")}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── SIDEBAR (desktop only) ───────────────────────── */}
            <div className="hidden lg:flex flex-col gap-6 lg:sticky lg:top-20">
              {/* Templates card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("sidebar_templates")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="w-full text-left text-sm text-primary hover:underline py-1 block"
                    >
                      {t(`template_${tpl.key}` as Parameters<typeof t>[0])}
                    </button>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">{t("templates_hint")}</p>
                </CardContent>
              </Card>

              {/* Live summary card */}
              <SummarySidebar
                t={t}
                selectedStore={selectedStore}
                selectedZone={selectedZone}
                selectedWorkType={selectedWorkType}
                summaryAssignee={summaryAssignee}
                watchedPlannedMinutes={watchedPlannedMinutes}
                watchedScheduledDate={watchedScheduledDate}
                watchedScheduledTime={watchedScheduledTime}
                watchedDueDate={watchedDueDate}
                watchedDueTime={watchedDueTime}
                watchedPolicy={watchedPolicy}
                watchedPhoto={watchedPhoto}
              />
            </div>
          </div>

          {/* ── STICKY FOOTER ─────────────────────────────────────────── */}
          <div className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-width,0px)] z-40 bg-background border-t border-border px-4 py-3 flex items-center justify-end gap-2">
            {/* Cancel with confirm dialog */}
            <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="h-10 min-w-[80px]"
                >
                  {t("btn_cancel")}
                </Button>
              </AlertDialogTrigger>
              <ConfirmDialog
                title={t("cancel_confirm_title")}
                message={t("cancel_confirm_message")}
                confirmLabel={t("cancel_confirm_leave")}
                cancelLabel={tCommon("cancel")}
                onConfirm={() => router.back()}
                onOpenChange={setShowCancelConfirm}
              />
            </AlertDialog>

            {/* Save & Add Another (create only, hidden on mobile) */}
            {mode === "create" && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={form.handleSubmit((v) => onSubmit(v, true))}
                className="h-10 hidden md:flex"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t("btn_save_add_another")}
              </Button>
            )}

            {/* Primary save */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 min-w-[100px]"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("btn_save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Summary sidebar sub-components ─────────────────────────────────

interface SummarySidebarProps {
  t: ReturnType<typeof useTranslations<"screen.taskForm">>;
  selectedStore?: Store;
  selectedZone?: Zone;
  selectedWorkType?: WorkType;
  summaryAssignee: string;
  watchedPlannedMinutes?: number;
  watchedScheduledDate?: Date;
  watchedScheduledTime?: string;
  watchedDueDate?: Date;
  watchedDueTime?: string;
  watchedPolicy?: AcceptancePolicy;
  watchedPhoto?: boolean;
}

function SummarySidebar({
  t,
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
}: SummarySidebarProps) {
  const notSet = t("summary_not_set");

  const formatDt = (date?: Date, time?: string) => {
    if (!date) return notSet;
    const d = format(date, "d MMM", { locale: ru });
    return time ? `${d} ${time}` : d;
  };

  const rows: { label: string; value: string }[] = [
    { label: t("summary_store"), value: selectedStore?.name ?? notSet },
    { label: t("summary_zone"), value: selectedZone?.name ?? notSet },
    { label: t("summary_work_type"), value: selectedWorkType?.name ?? notSet },
    { label: t("summary_assignee"), value: summaryAssignee },
    {
      label: t("summary_plan"),
      value: watchedPlannedMinutes
        ? t("summary_minutes", { min: watchedPlannedMinutes })
        : notSet,
    },
    {
      label: t("summary_scheduled"),
      value: formatDt(watchedScheduledDate, watchedScheduledTime),
    },
    {
      label: t("summary_due"),
      value: formatDt(watchedDueDate, watchedDueTime),
    },
    {
      label: t("summary_policy"),
      value:
        watchedPolicy === "AUTO"
          ? t("policy_auto")
          : watchedPolicy === "MANUAL"
          ? t("policy_manual")
          : notSet,
    },
    {
      label: t("summary_photo"),
      value: watchedPhoto ? t("summary_photo_yes") : t("summary_photo_no"),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("sidebar_summary")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2 text-sm">
              <dt className="text-muted-foreground shrink-0">{row.label}</dt>
              <dd className="text-foreground text-right truncate max-w-[140px]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function MobileSummarySidebar({
  t,
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
}: SummarySidebarProps) {
  const [open, setOpen] = useState(false);
  const notSet = t("summary_not_set");

  const formatDt = (date?: Date, time?: string) => {
    if (!date) return notSet;
    const d = format(date, "d MMM", { locale: ru });
    return time ? `${d} ${time}` : d;
  };

  const rows: { label: string; value: string }[] = [
    { label: t("summary_store"), value: selectedStore?.name ?? notSet },
    { label: t("summary_zone"), value: selectedZone?.name ?? notSet },
    { label: t("summary_work_type"), value: selectedWorkType?.name ?? notSet },
    { label: t("summary_assignee"), value: summaryAssignee },
    {
      label: t("summary_plan"),
      value: watchedPlannedMinutes
        ? t("summary_minutes", { min: watchedPlannedMinutes })
        : notSet,
    },
    { label: t("summary_scheduled"), value: formatDt(watchedScheduledDate, watchedScheduledTime) },
    { label: t("summary_due"), value: formatDt(watchedDueDate, watchedDueTime) },
    {
      label: t("summary_policy"),
      value:
        watchedPolicy === "AUTO"
          ? t("policy_auto")
          : watchedPolicy === "MANUAL"
          ? t("policy_manual")
          : notSet,
    },
    {
      label: t("summary_photo"),
      value: watchedPhoto ? t("summary_photo_yes") : t("summary_photo_no"),
    },
  ];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
          >
            {t("sidebar_summary")}
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-border">
            <dl className="space-y-2 pt-3">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-2 text-sm">
                  <dt className="text-muted-foreground shrink-0">{row.label}</dt>
                  <dd className="text-foreground text-right truncate max-w-[160px]">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
