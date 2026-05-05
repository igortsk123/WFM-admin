"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  User,
  Briefcase,
  ShieldCheck,
  Send,
  CheckCircle2,
  Loader2,
  CalendarIcon,
  Upload,
  Info,
  X,
  ChevronRight,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { PageHeader, ConfirmDialog, PermissionPill } from "@/components/shared";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  createUser,
  getStores,
  getPositions,
  getAgents,
  type UserCreateData,
  type InviteMethod,
  type OfertaChannel,
  type StoreWithStats,
  type PositionWithCounts,
} from "@/lib/api";
import type { Agent } from "@/lib/types";
import type { Permission, EmployeeType } from "@/lib/types";

// ─── Zod schemas per step ───────────────────────────────────────────────────

function buildStep1Schema(tV: (key: string) => string) {
  return z.object({
    last_name: z.string().min(2, tV("last_name_min")),
    first_name: z.string().min(2, tV("first_name_min")),
    middle_name: z.string().optional(),
    phone: z
      .string()
      .min(1, tV("phone_required"))
      .regex(/^\+\d{1,4}[\s()\d-]{6,20}$/, tV("phone_invalid")),
    email: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        tV("email_invalid")
      ),
    date_of_birth: z.date().optional(),
    employee_type: z.enum(["STAFF", "FREELANCE"]),
    /** Доля ставки — для штатных сотрудников. */
    rate_fraction: z.enum(["QUARTER", "HALF", "THREE_QUARTER", "FULL"]).optional(),
    avatar_preview: z.string().optional(),
  });
}

function buildStep2Schema(tV: (key: string) => string) {
  return z.object({
    store_id: z.number({ message: tV("store_required") }).positive(tV("store_required")),
    position_id: z.number({ message: tV("position_required") }).positive(tV("position_required")),
    rank: z.number().min(1).max(6).default(1),
    hired_at: z
      .date()
      .refine(
        (d) => d <= new Date(),
        tV("hired_at_future")
      )
      .default(new Date()),
  });
}

function buildStep3Schema() {
  return z.object({
    permissions: z.array(z.enum(["CASHIER", "SALES_FLOOR", "SELF_CHECKOUT", "WAREHOUSE", "PRODUCTION_LINE"])),
  });
}

function buildStep4Schema(tV: (key: string) => string) {
  return z.object({
    invite_method: z.enum(["EMAIL", "TELEGRAM", "MAX", "WHATSAPP", "NONE"], {
      message: tV("invite_method_required"),
    }),
    invite_message: z.string().optional(),
    notify_manager: z.boolean().default(false),
  });
}

// ─── Master wizard form value ────────────────────────────────────────────────

interface WizardValues {
  // Step 1
  last_name: string;
  first_name: string;
  middle_name?: string;
  phone: string;
  email?: string;
  date_of_birth?: Date;
  employee_type: EmployeeType;
  rate_fraction?: "QUARTER" | "HALF" | "THREE_QUARTER" | "FULL";
  avatar_preview?: string;
  // Step 2
  store_id: number;
  position_id: number;
  rank: number;
  hired_at: Date;
  /** Agent ID — only for FREELANCE + NOMINAL_ACCOUNT */
  agent_id?: string | null;
  /** Oferta delivery channel — only for FREELANCE */
  oferta_channel?: OfertaChannel;
  // Step 3
  permissions: Permission[];
  // Step 4
  invite_method: InviteMethod;
  invite_message?: string;
  notify_manager: boolean;
}

const PERMISSIONS_LIST: Permission[] = ["CASHIER", "SALES_FLOOR", "SELF_CHECKOUT", "WAREHOUSE", "PRODUCTION_LINE"];

const PERM_ICONS: Record<Permission, React.ReactNode> = {
  CASHIER: <span className="text-base">🏧</span>,
  SALES_FLOOR: <span className="text-base">🛒</span>,
  SELF_CHECKOUT: <span className="text-base">🖥️</span>,
  WAREHOUSE: <span className="text-base">📦</span>,
  PRODUCTION_LINE: <span className="text-base">⚙️</span>,
};

// ─── Phone country codes ────────────────────────────────────────────────────
type PhoneCountry = {
  code: string; // ISO-2 used as key
  flag: string;
  dial: string; // dial prefix incl '+', e.g. '+7'
  name: string;
  /** Number of national digits expected after the dial prefix. */
  length: number;
};

const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "RU", flag: "🇷🇺", dial: "+7", name: "Россия", length: 10 },
  { code: "KZ", flag: "🇰🇿", dial: "+7", name: "Казахстан", length: 10 },
  { code: "BY", flag: "🇧🇾", dial: "+375", name: "Беларусь", length: 9 },
  { code: "UA", flag: "🇺🇦", dial: "+380", name: "Украина", length: 9 },
  { code: "TJ", flag: "🇹🇯", dial: "+992", name: "Таджикистан", length: 9 },
  { code: "KG", flag: "🇰🇬", dial: "+996", name: "Кыргызстан", length: 9 },
  { code: "UZ", flag: "🇺🇿", dial: "+998", name: "Узбекистан", length: 9 },
];

const DEFAULT_COUNTRY: PhoneCountry = PHONE_COUNTRIES[0];

// Phone mask helper — формат подстраивается под страну
function applyPhoneMask(raw: string, country: PhoneCountry = DEFAULT_COUNTRY): string {
  const dialDigits = country.dial.replace(/\D/g, "");
  const allDigits = raw.replace(/\D/g, "");
  const national = allDigits.startsWith(dialDigits)
    ? allDigits.slice(dialDigits.length)
    : allDigits;
  const d = national.slice(0, country.length);
  let result = country.dial;
  // RU/KZ — формат +7 (XXX) XXX-XX-XX, остальные — +XXX XX XXX XX XX
  if (country.dial === "+7") {
    if (d.length > 0) result += ` (${d.slice(0, 3)}`;
    if (d.length >= 3) result += `) ${d.slice(3, 6)}`;
    if (d.length >= 6) result += `-${d.slice(6, 8)}`;
    if (d.length >= 8) result += `-${d.slice(8, 10)}`;
  } else {
    if (d.length > 0) result += ` ${d.slice(0, 2)}`;
    if (d.length >= 2) result += ` ${d.slice(2, 5)}`;
    if (d.length >= 5) result += ` ${d.slice(5, 7)}`;
    if (d.length >= 7) result += ` ${d.slice(7, 9)}`;
  }
  return result;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmployeeCreateWizard() {
  const t = useTranslations("screen.employeeCreate");
  const tV = useTranslations("screen.employeeCreate.validation");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [stores, setStores] = useState<StoreWithStats[]>([]);
  const [positions, setPositions] = useState<PositionWithCounts[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [storeOpen, setStoreOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(DEFAULT_COUNTRY);
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [, setLoadingData] = useState(true);
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  // Payment mode for the demo org — determines agent field visibility
  const [isNominalAccount, setIsNominalAccount] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Master form values accumulated across steps
  const [masterValues, setMasterValues] = useState<Partial<WizardValues>>({
    employee_type: "STAFF",
    rank: 1,
    hired_at: new Date(),
    agent_id: null,
    oferta_channel: "SMS",
    permissions: [],
    invite_method: "NONE",
    notify_manager: false,
  });

  // Load stores + positions + agents on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [storesRes, positionsRes] = await Promise.all([
          getStores(),
          getPositions(),
        ]);
        setStores(storesRes.data);
        setPositions(positionsRes.data);
        // Try loading agents (only available for NOMINAL_ACCOUNT orgs)
        try {
          const agentsRes = await getAgents({ page_size: 100 });
          setAgents(agentsRes.data);
          setIsNominalAccount(true);
        } catch {
          // MODULE_DISABLED = CLIENT_DIRECT mode
          setAgents([]);
          setIsNominalAccount(false);
        }
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  // ── Step 1 form ─────────────────────────────────────────────────────────────
  const step1Schema = buildStep1Schema((key) => tV(key as Parameters<typeof tV>[0]));
  const form1 = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      last_name: masterValues.last_name ?? "",
      first_name: masterValues.first_name ?? "",
      middle_name: masterValues.middle_name ?? "",
      phone: masterValues.phone ?? "",
      email: masterValues.email ?? "",
      date_of_birth: masterValues.date_of_birth,
      employee_type: masterValues.employee_type ?? "STAFF",
      rate_fraction: masterValues.rate_fraction ?? "FULL",
      avatar_preview: avatarPreview,
    },
  });

  // ── Step 2 form ─────────────────────────────────────────────────────────────
  const step2Schema = buildStep2Schema((key) => tV(key as Parameters<typeof tV>[0]));
  const form2 = useForm<z.input<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      store_id: masterValues.store_id ?? (undefined as unknown as number),
      position_id: masterValues.position_id ?? (undefined as unknown as number),
      rank: masterValues.rank ?? 1,
      hired_at: masterValues.hired_at ?? new Date(),
    },
  });

  // ── Step 3 form ─────────────────────────────────────────────────────────────
  const step3Schema = buildStep3Schema();
  const form3 = useForm<z.infer<typeof step3Schema>>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      permissions: (masterValues.permissions as ("CASHIER" | "SALES_FLOOR" | "SELF_CHECKOUT" | "WAREHOUSE" | "PRODUCTION_LINE")[]) ?? [],
    },
  });

  // ── Step 4 form ─────────────────────────────────────────────────────────────
  const step4Schema = buildStep4Schema((key) => tV(key as Parameters<typeof tV>[0]));
  const form4 = useForm<z.input<typeof step4Schema>>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      invite_method: masterValues.invite_method ?? "NONE",
      invite_message: masterValues.invite_message ?? buildInviteTemplate(masterValues),
      notify_manager: masterValues.notify_manager ?? false,
    },
  });

  function buildInviteTemplate(vals: Partial<WizardValues>): string {
    const fio = [vals.last_name, vals.first_name, vals.middle_name]
      .filter(Boolean)
      .join(" ") || "{fio}";
    const store = stores.find((s) => s.id === vals.store_id)?.name || "{store}";
    return `Здравствуйте, ${fio}! Вас пригласили в WFM — систему управления задачами магазина ${store}. Скачайте приложение по ссылке: {link}`;
  }

  // ── Determine if selected position is a manager (role_id=2) ─────────────────
  const selectedPositionId = form2.watch("store_id") !== undefined
    ? form2.watch("position_id")
    : masterValues.position_id;
  const selectedPosition = positions.find((p) => p.id === selectedPositionId);
  const isManagerPosition = selectedPosition?.role_id === 2;

  // ── Keyboard shortcut ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleStepAction();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // ── isDirty ───────────────────────────────────────────────────────────────────
  const isDirty =
    form1.formState.isDirty ||
    form2.formState.isDirty ||
    form3.formState.isDirty ||
    form4.formState.isDirty;

  // ── Step action: validate + advance ─────────────────────────────────────────
  const handleStepAction = useCallback(async () => {
    if (currentStep === 1) {
      const ok = await form1.trigger();
      if (!ok) return;
      const vals = form1.getValues();
      const merged = { ...masterValues, ...vals };
      setMasterValues(merged);
      // Refresh invite template
      const template = buildInviteTemplate(merged);
      if (!form4.getValues("invite_message")) {
        form4.setValue("invite_message", template);
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const ok = await form2.trigger();
      if (!ok) return;
      const vals = form2.getValues();
      setMasterValues((prev) => ({ ...prev, ...vals }));
      // Skip step 3 for managers? No, still go to 3 and show skipped state
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const ok = await form3.trigger();
      if (!ok) return;
      const vals = form3.getValues();
      setMasterValues((prev) => ({ ...prev, ...vals }));
      setCurrentStep(4);
    } else if (currentStep === 4) {
      await handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, form1, form2, form3, form4]);

  // ── Final submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const ok = await form4.trigger();
    if (!ok) return;

    setIsSubmitting(true);

    const s1 = form1.getValues();
    const s2 = form2.getValues();
    const s3 = form3.getValues();
    const s4 = form4.getValues();

    const isFreelance = s1.employee_type === "FREELANCE";

    const payload: UserCreateData = {
      first_name: s1.first_name,
      last_name: s1.last_name,
      middle_name: s1.middle_name || undefined,
      phone: s1.phone,
      email: s1.email || undefined,
      date_of_birth: s1.date_of_birth?.toISOString(),
      type: s1.employee_type,
      position_id: s2.position_id,
      store_id: s2.store_id,
      rank: s2.rank,
      hired_at: (s2.hired_at ?? new Date()).toISOString().split("T")[0],
      permissions: isManagerPosition ? [] : (s3.permissions as Permission[]),
      invite_method: s4.invite_method as InviteMethod,
      invite_message: s4.invite_message,
      notify_manager: s4.notify_manager,
      // Freelance-specific fields
      agent_id: isFreelance && isNominalAccount ? (masterValues.agent_id ?? null) : undefined,
      oferta_channel: isFreelance ? (masterValues.oferta_channel ?? "SMS") : undefined,
    };

    try {
      const result = await createUser(payload);

      if (!result.success) {
        if (result.error?.code === "DUPLICATE_PHONE") {
          // Show toast with action
          toast.error(t("toast.duplicate_phone"), {
            action: {
              label: t("toast.duplicate_open_existing"),
              onClick: () => router.push(ADMIN_ROUTES.employees),
            },
          });
        } else {
          toast.error(t("toast.error"));
        }
        return;
      }

      const newId = result.id;
      if (isFreelance) {
        // FREELANCE: always show oferta-sent toast, redirect to documents tab
        toast.success(t("toast.freelance_created"));
        if (newId) {
          router.push(`${ADMIN_ROUTES.employeeDetail(newId)}?tab=documents`);
        } else {
          router.push(ADMIN_ROUTES.employees);
        }
      } else {
        if (s4.invite_method === "NONE") {
          toast.success(t("toast.created_no_invite"));
        } else {
          toast.success(t("toast.created"));
        }
        if (newId) {
          router.push(ADMIN_ROUTES.employeeDetail(newId));
        } else {
          router.push(ADMIN_ROUTES.employees);
        }
      }
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Cancel handler ────────────────────────────────────────────────────────────
  function handleCancel() {
    if (isDirty) {
      setCancelOpen(true);
    } else {
      router.push(ADMIN_ROUTES.employees);
    }
  }

  function confirmCancel() {
    router.push(ADMIN_ROUTES.employees);
  }

  // ── Avatar file pick ─────────────────────────────────────────────────────────��
  function handleAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setAvatarPreview(url);
    };
    reader.readAsDataURL(file);
  }

  // ── Summary data ──────────────────────────────────────────────────────────────
  const s1Watch = form1.watch();
  const s2Watch = form2.watch();
  const s3Watch = form3.watch();
  const s4Watch = form4.watch();

  const summaryFio = [s1Watch.last_name, s1Watch.first_name, s1Watch.middle_name]
    .filter(Boolean)
    .join(" ");
  const summaryStore = stores.find((s) => s.id === s2Watch.store_id)?.name;
  const summaryPosition = positions.find((p) => p.id === s2Watch.position_id)?.name;
  const summaryPerms = (s3Watch.permissions ?? []) as Permission[];

  // ── Steps meta ────────────────────────────────────────────────────────────────
  const steps = [
    {
      number: 1,
      label: t("steps.personal"),
      sub: t("steps.personal_sub"),
      icon: User,
    },
    {
      number: 2,
      label: t("steps.position"),
      sub: t("steps.position_sub"),
      icon: Briefcase,
    },
    {
      number: 3,
      label: t("steps.permissions"),
      sub: t("steps.permissions_sub"),
      icon: ShieldCheck,
    },
    {
      number: 4,
      label: t("steps.invite"),
      sub: t("steps.invite_sub"),
      icon: Send,
    },
  ];

  // ── Summary card (shared between desktop sidebar & mobile sheet) ──────────────
  const SummaryCard = () => (
    <Card className="rounded-xl border border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">
          {t("step4.summary_title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <dl className="space-y-2 text-sm">
          <SummaryRow label={t("summary.fio")} value={summaryFio || t("summary.not_set")} />
          <SummaryRow label={t("summary.phone")} value={s1Watch.phone || t("summary.not_set")} />
          <SummaryRow label={t("summary.email")} value={s1Watch.email || t("summary.not_set")} />
          <SummaryRow
            label={t("summary.employment")}
            value={
              s1Watch.employee_type === "FREELANCE"
                ? t("step1.employment_freelance")
                : t("step1.employment_staff")
            }
          />
          <SummaryRow label={t("summary.store")} value={summaryStore || t("summary.not_set")} />
          <SummaryRow label={t("summary.position")} value={summaryPosition || t("summary.not_set")} />
          <SummaryRow label={t("summary.rank")} value={s2Watch.rank ? String(s2Watch.rank) : "1"} />
          <SummaryRow
            label={t("summary.hired_at")}
            value={
              s2Watch.hired_at
                ? format(s2Watch.hired_at, "d MMM yyyy", { locale: ru })
                : t("summary.not_set")
            }
          />
          <div>
            <dt className="text-muted-foreground">{t("summary.permissions")}</dt>
            <dd className="mt-1">
              {summaryPerms.length === 0 ? (
                <span className="text-muted-foreground text-xs">{t("summary.permissions_none")}</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {summaryPerms.map((p) => (
                    <PermissionPill key={p} permission={p} />
                  ))}
                </div>
              )}
            </dd>
          </div>
          {s1Watch.employee_type === "FREELANCE" && isNominalAccount && (
            <SummaryRow
              label={t("summary.agent")}
              value={
                masterValues.agent_id
                  ? (agents.find((a) => a.id === masterValues.agent_id)?.name ?? t("summary.not_set"))
                  : t("step2.agent_none")
              }
            />
          )}
          {s1Watch.employee_type === "FREELANCE" && (
            <SummaryRow
              label={t("summary.oferta_channel")}
              value={
                masterValues.oferta_channel === "SMS"
                  ? t("step1.oferta_sms")
                  : masterValues.oferta_channel === "TELEGRAM"
                  ? t("step1.oferta_telegram")
                  : t("step1.oferta_email")
              }
            />
          )}
          <SummaryRow
            label={t("summary.invite_method")}
            value={
              s4Watch.invite_method === "EMAIL"
                ? t("step4.method_email")
                : s4Watch.invite_method === "TELEGRAM"
                ? "Telegram"
                : s4Watch.invite_method === "MAX"
                ? "Max"
                : s4Watch.invite_method === "WHATSAPP"
                ? "WhatsApp"
                : t("step4.method_none")
            }
          />
        </dl>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Breadcrumb / Header */}
      <div className="mb-6">
        <PageHeader
          title={t("page_title")}
          breadcrumbs={[
            { label: t("breadcrumb_home"), href: ADMIN_ROUTES.dashboard },
            { label: t("breadcrumb_employees"), href: ADMIN_ROUTES.employees },
            { label: t("breadcrumb_new") },
          ]}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* ── Left: vertical stepper (desktop only) ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-1">
            {steps.map((step) => {
              const isCompleted = step.number < currentStep;
              const isCurrent = step.number === currentStep;
              return (
                <button
                  key={step.number}
                  disabled={!isCompleted}
                  onClick={() => isCompleted && setCurrentStep(step.number)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isCurrent && "bg-muted",
                    isCompleted && "cursor-pointer hover:bg-muted/60",
                    !isCompleted && !isCurrent && "cursor-default opacity-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isCompleted && "bg-success text-success-foreground",
                      isCurrent && "bg-primary text-primary-foreground",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      step.number
                    )}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{step.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Right: form card (col-span-3) ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Mobile horizontal stepper */}
          <div className="flex items-center gap-1 overflow-x-auto lg:hidden pb-1">
            {steps.map((step, i) => {
              const isCompleted = step.number < currentStep;
              const isCurrent = step.number === currentStep;
              return (
                <div key={step.number} className="flex items-center">
                  <button
                    disabled={!isCompleted}
                    onClick={() => isCompleted && setCurrentStep(step.number)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-1 rounded-md min-w-[56px]",
                      isCompleted && "cursor-pointer",
                      !isCompleted && !isCurrent && "opacity-40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isCompleted && "bg-success text-success-foreground",
                        isCurrent && "bg-primary text-primary-foreground",
                        !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        step.number
                      )}
                    </span>
                    <span className={cn("text-[10px] font-medium text-center leading-tight", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                      {step.label}
                    </span>
                  </button>
                  {i < steps.length - 1 && (
                    <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step card */}
          <Card className="rounded-xl border border-border">
            <CardContent className="p-4 md:p-6">
              {/* ── STEP 1 ── */}
              {currentStep === 1 && (
                <Form {...form1}>
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStepAction();
                    }}
                  >
                    {/* Avatar */}
                    <div>
                      <Label className="mb-2 block text-sm font-medium">
                        {t("step1.avatar")}
                      </Label>
                      <div
                        className="flex items-center gap-4"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files[0];
                          if (file) handleAvatarFile(file);
                        }}
                      >
                        <Avatar className="size-16 shrink-0">
                          <AvatarImage src={avatarPreview} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                            {(form1.watch("first_name")?.[0] ?? "") +
                              (form1.watch("last_name")?.[0] ?? "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
                            )}
                          >
                            <Upload className="size-4" />
                            <span className="hidden md:inline">{t("step1.avatar_drop")}</span>
                            <span className="md:hidden">{t("step1.avatar")} (tap)</span>
                          </button>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("step1.avatar_constraints")}
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarFile(file);
                            }}
                          />
                        </div>
                        {avatarPreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={() => setAvatarPreview(undefined)}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Name fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form1.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("step1.last_name")} *</FormLabel>
                            <FormControl>
                              <Input {...field} autoFocus autoComplete="family-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form1.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("step1.first_name")} *</FormLabel>
                            <FormControl>
                              <Input {...field} autoComplete="given-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form1.control}
                      name="middle_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("step1.middle_name")}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({t("step1.middle_name")} — необязательно)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} autoComplete="additional-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone */}
                    <FormField
                      control={form1.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("step1.phone")} *</FormLabel>
                          <div className="flex gap-2">
                            <Popover open={phoneCountryOpen} onOpenChange={setPhoneCountryOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={phoneCountryOpen}
                                  className="w-[110px] justify-between px-3"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-base leading-none">{phoneCountry.flag}</span>
                                    <span className="text-sm">{phoneCountry.dial}</span>
                                  </span>
                                  <ChevronsUpDown className="size-3.5 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[260px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder={t("step1.phone_country_search")} />
                                  <CommandList>
                                    <CommandEmpty>{t("step1.phone_country_empty")}</CommandEmpty>
                                    <CommandGroup>
                                      {PHONE_COUNTRIES.map((c) => (
                                        <CommandItem
                                          key={c.code}
                                          value={`${c.name} ${c.dial}`}
                                          onSelect={() => {
                                            setPhoneCountry(c);
                                            setPhoneCountryOpen(false);
                                            field.onChange(applyPhoneMask("", c));
                                          }}
                                        >
                                          <span className="mr-2 text-base">{c.flag}</span>
                                          <span className="flex-1">{c.name}</span>
                                          <span className="text-xs text-muted-foreground">{c.dial}</span>
                                          <Check
                                            className={cn(
                                              "ml-2 size-4",
                                              phoneCountry.code === c.code ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("step1.phone_placeholder")}
                                inputMode="tel"
                                onChange={(e) => {
                                  const masked = applyPhoneMask(e.target.value, phoneCountry);
                                  field.onChange(masked);
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form1.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("step1.email")}{" "}
                            <span className="text-xs text-muted-foreground">(необязательно)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder={t("step1.email_placeholder")}
                              autoComplete="email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date of birth */}
                    <FormField
                      control={form1.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>
                            {t("step1.date_of_birth")}{" "}
                            <span className="text-xs text-muted-foreground">(необязательно)</span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 size-4" />
                                  {field.value
                                    ? format(field.value, "d MMMM yyyy", { locale: ru })
                                    : "—"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Employment type — только STAFF; внештатники ведутся через /freelance/agents.
                        Поле скрыто из UI, всегда STAFF. Доля ставки — отдельным полем ниже. */}

                    {/* Доля ставки */}
                    <FormField
                      control={form1.control}
                      name="rate_fraction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("step1.rate_fraction_label")}</FormLabel>
                          <Select value={field.value ?? "FULL"} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("step1.rate_fraction_placeholder")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="QUARTER">{t("step1.rate_quarter")}</SelectItem>
                              <SelectItem value="HALF">{t("step1.rate_half")}</SelectItem>
                              <SelectItem value="THREE_QUARTER">{t("step1.rate_three_quarter")}</SelectItem>
                              <SelectItem value="FULL">{t("step1.rate_full")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}

              {/* ── STEP 2 ── */}
              {currentStep === 2 && (
                <Form {...form2}>
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStepAction();
                    }}
                  >
                    {/* Store combobox */}
                    <FormField
                      control={form2.control}
                      name="store_id"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t("step2.store")} *</FormLabel>
                          <Popover open={storeOpen} onOpenChange={setStoreOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? stores.find((s) => s.id === field.value)?.name
                                    : t("step2.store_placeholder")}
                                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder={t("step2.store_search")} />
                                <CommandList>
                                  <CommandEmpty>{t("step2.store_placeholder")}</CommandEmpty>
                                  <CommandGroup>
                                    {stores.map((store) => (
                                      <CommandItem
                                        key={store.id}
                                        value={`${store.external_code} ${store.name}`}
                                        onSelect={() => {
                                          field.onChange(store.id);
                                          setStoreOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 size-4",
                                            field.value === store.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span className="font-medium">{store.name}</span>
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          {store.external_code} · {store.city}
                                        </span>
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

                    {/* Position combobox */}
                    <FormField
                      control={form2.control}
                      name="position_id"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t("step2.position")} *</FormLabel>
                          <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? positions.find((p) => p.id === field.value)?.name
                                    : t("step2.position_placeholder")}
                                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder={t("step2.position_placeholder")} />
                                <CommandList>
                                  <CommandEmpty>{t("step2.position_placeholder")}</CommandEmpty>
                                  <CommandGroup>
                                    {positions.map((pos) => (
                                      <CommandItem
                                        key={pos.id}
                                        value={`${pos.code} ${pos.name}`}
                                        onSelect={() => {
                                          field.onChange(pos.id);
                                          setPositionOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 size-4",
                                            field.value === pos.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span>{pos.name}</span>
                                        {pos.role_id === 2 && (
                                          <Badge variant="secondary" className="ml-2 text-[10px]">
                                            Управляющий
                                          </Badge>
                                        )}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <p className="text-xs text-muted-foreground">{t("step2.position_hint")}</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Rank */}
                    <FormField
                      control={form2.control}
                      name="rank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("step2.rank")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={6}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                              className="w-24"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">{t("step2.rank_hint")}</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Hired at */}
                    <FormField
                      control={form2.control}
                      name="hired_at"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t("step2.hired_at")}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <CalendarIcon className="mr-2 size-4" />
                                  {field.value
                                    ? format(field.value, "d MMMM yyyy", { locale: ru })
                                    : format(new Date(), "d MMMM yyyy", { locale: ru })}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(d) => d && field.onChange(d)}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Agent combobox — only for FREELANCE + NOMINAL_ACCOUNT */}
                    {masterValues.employee_type === "FREELANCE" && isNominalAccount && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium">
                          {t("step2.agent")}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({tCommon("optional")})
                          </span>
                        </Label>
                        <Popover open={agentOpen} onOpenChange={setAgentOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between font-normal"
                            >
                              {masterValues.agent_id
                                ? agents.find((a) => a.id === masterValues.agent_id)?.name
                                : t("step2.agent_placeholder")}
                              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder={t("step2.agent_placeholder")} />
                              <CommandList>
                                <CommandEmpty>{t("step2.agent_none")}</CommandEmpty>
                                <CommandGroup>
                                  {/* "No agent" option */}
                                  <CommandItem
                                    value="__none__"
                                    onSelect={() => {
                                      setMasterValues((prev) => ({ ...prev, agent_id: null }));
                                      setAgentOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 size-4",
                                        !masterValues.agent_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="text-muted-foreground">
                                      {t("step2.agent_none")}
                                    </span>
                                  </CommandItem>
                                  {agents.map((agent) => (
                                    <CommandItem
                                      key={agent.id}
                                      value={agent.name}
                                      onSelect={() => {
                                        setMasterValues((prev) => ({ ...prev, agent_id: agent.id }));
                                        setAgentOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 size-4",
                                          masterValues.agent_id === agent.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {agent.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">{t("step2.agent_hint")}</p>
                      </div>
                    )}

                    {/* Oferta channel — only for FREELANCE */}
                    {masterValues.employee_type === "FREELANCE" && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium">
                          {t("step1.oferta_channel")}
                        </Label>
                        <RadioGroup
                          value={masterValues.oferta_channel ?? "SMS"}
                          onValueChange={(val) =>
                            setMasterValues((prev) => ({
                              ...prev,
                              oferta_channel: val as OfertaChannel,
                            }))
                          }
                          className="space-y-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="SMS" id="oferta-sms" />
                            <Label htmlFor="oferta-sms" className="font-normal cursor-pointer">
                              {t("step1.oferta_sms")}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="TELEGRAM" id="oferta-telegram" />
                            <Label htmlFor="oferta-telegram" className="font-normal cursor-pointer">
                              {t("step1.oferta_telegram")}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="EMAIL" id="oferta-email" />
                            <Label htmlFor="oferta-email" className="font-normal cursor-pointer">
                              {t("step1.oferta_email")}
                            </Label>
                          </div>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground">
                          {t("step1.oferta_default_hint")}
                        </p>
                      </div>
                    )}

                    {/* Role alert */}
                    <Alert className="border-info/30 bg-info/5">
                      <Info className="size-4 text-info" />
                      <AlertDescription className="text-sm">
                        {t("step2.role_alert")}
                      </AlertDescription>
                    </Alert>
                  </form>
                </Form>
              )}

              {/* ── STEP 3 ── */}
              {currentStep === 3 && (
                <Form {...form3}>
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStepAction();
                    }}
                  >
                    <div>
                      <h2 className="text-base font-semibold text-foreground mb-1">
                        {t("step3.title")}
                      </h2>
                    </div>

                    {isManagerPosition ? (
                      <Alert className="border-warning/30 bg-warning/5">
                        <ShieldCheck className="size-4 text-warning" />
                        <AlertDescription>
                          <span className="font-medium">{t("step3.manager_skip")}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {t("step3.manager_skip_subtitle")}
                          </span>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <Alert className="border-info/30 bg-info/5">
                          <Info className="size-4 text-info" />
                          <AlertDescription className="text-sm">
                            {t("step3.info_alert")}
                          </AlertDescription>
                        </Alert>

                        <FormField
                          control={form3.control}
                          name="permissions"
                          render={({ field }) => (
                            <FormItem>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {PERMISSIONS_LIST.map((perm) => {
                                  const isChecked = (field.value as Permission[]).includes(perm);
                                  return (
                                    <label
                                      key={perm}
                                      htmlFor={`perm-${perm}`}
                                      className={cn(
                                        "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                                        isChecked
                                          ? "border-primary/40 bg-primary/5"
                                          : "border-border bg-card hover:bg-muted/30"
                                      )}
                                    >
                                      <Checkbox
                                        id={`perm-${perm}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          const current = field.value as Permission[];
                                          if (checked) {
                                            field.onChange([...current, perm]);
                                          } else {
                                            field.onChange(current.filter((p) => p !== perm));
                                          }
                                        }}
                                        className="mt-0.5"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          {PERM_ICONS[perm]}
                                          <PermissionPill permission={perm} />
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {perm === "CASHIER" && t("step3.permission_cashier")}
                                          {perm === "SALES_FLOOR" && t("step3.permission_sales_floor")}
                                          {perm === "SELF_CHECKOUT" && t("step3.permission_self_checkout")}
                                          {perm === "WAREHOUSE" && t("step3.permission_warehouse")}
                                          {perm === "PRODUCTION_LINE" && t("step3.permission_production_line")}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </form>
                </Form>
              )}

              {/* ── STEP 4 ── */}
              {currentStep === 4 && (
                <Form {...form4}>
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStepAction();
                    }}
                  >
                    {/* Invite — toggle "отправить" + выбор канала */}
                    <FormField
                      control={form4.control}
                      name="invite_method"
                      render={({ field }) => {
                        const emailAvailable = !!s1Watch.email;
                        const sendInvite = field.value !== "NONE";
                        return (
                          <FormItem>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <div className="flex flex-col gap-0.5">
                                <Label className="text-sm font-medium">{t("step4.send_invite")}</Label>
                                <span className="text-xs text-muted-foreground">{t("step4.send_invite_hint")}</span>
                              </div>
                              <Switch
                                checked={sendInvite}
                                onCheckedChange={(v) => field.onChange(v ? (emailAvailable ? "EMAIL" : "TELEGRAM") : "NONE")}
                              />
                            </div>
                            {sendInvite && (
                              <div className="mt-3">
                                <FormLabel className="text-sm">{t("step4.method")}</FormLabel>
                                <RadioGroup
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  className="mt-2 grid grid-cols-2 gap-2"
                                >
                                  <Label
                                    htmlFor="invite-email"
                                    className={cn(
                                      "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                                      !emailAvailable && "opacity-50 cursor-not-allowed",
                                      field.value === "EMAIL" && "border-primary bg-primary/5",
                                    )}
                                  >
                                    <RadioGroupItem value="EMAIL" id="invite-email" disabled={!emailAvailable} />
                                    <span className="text-sm">{t("step4.method_email")}</span>
                                  </Label>
                                  <Label
                                    htmlFor="invite-telegram"
                                    className={cn(
                                      "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                                      field.value === "TELEGRAM" && "border-primary bg-primary/5",
                                    )}
                                  >
                                    <RadioGroupItem value="TELEGRAM" id="invite-telegram" />
                                    <span className="text-sm">Telegram</span>
                                  </Label>
                                  <Label
                                    htmlFor="invite-max"
                                    className={cn(
                                      "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                                      field.value === "MAX" && "border-primary bg-primary/5",
                                    )}
                                  >
                                    <RadioGroupItem value="MAX" id="invite-max" />
                                    <span className="text-sm">Max</span>
                                  </Label>
                                  <Label
                                    htmlFor="invite-whatsapp"
                                    className={cn(
                                      "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                                      field.value === "WHATSAPP" && "border-primary bg-primary/5",
                                    )}
                                  >
                                    <RadioGroupItem value="WHATSAPP" id="invite-whatsapp" />
                                    <span className="text-sm">WhatsApp</span>
                                  </Label>
                                </RadioGroup>
                                {!emailAvailable && field.value === "EMAIL" && (
                                  <p className="mt-1.5 text-xs text-muted-foreground">
                                    {t("step4.method_email_disabled_hint")}
                                  </p>
                                )}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Invite message */}
                    {form4.watch("invite_method") !== "NONE" && (
                      <FormField
                        control={form4.control}
                        name="invite_message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("step4.message")}</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={4}
                                className="resize-none text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Notify manager */}
                    <FormField
                      control={form4.control}
                      name="notify_manager"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 rounded-lg border border-border p-4">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div>
                            <Label className="text-sm font-medium cursor-pointer">
                              {t("step4.notify_manager")}
                            </Label>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Summary card (desktop: visible inside step 4 inline; also in sidebar for all steps) */}
                    <div>
                      <SummaryCard />
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Mobile summary button (only steps 1-3) */}
          {currentStep < 4 && (
            <div className="lg:hidden">
              <Sheet open={summarySheetOpen} onOpenChange={setSummarySheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    {t("step4.summary_title")}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-xl">
                  <SheetHeader className="mb-4">
                    <SheetTitle>{t("step4.summary_title")}</SheetTitle>
                  </SheetHeader>
                  <SummaryCard />
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* ── Sticky footer ── */}
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
            <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-2 px-4 md:px-6">
              {/* Cancel — icon-only on mobile */}
              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCancel();
                    }}
                    className="min-h-[44px] px-3"
                    aria-label={t("footer.cancel")}
                  >
                    <X className="size-4 lg:hidden" />
                    <span className="hidden lg:inline">{t("footer.cancel")}</span>
                  </Button>
                </AlertDialogTrigger>
                <ConfirmDialog
                  title={t("dialogs.cancel_title")}
                  message={t("dialogs.cancel_description")}
                  confirmLabel={t("dialogs.cancel_confirm")}
                  cancelLabel={t("dialogs.cancel_back")}
                  onConfirm={confirmCancel}
                  onOpenChange={setCancelOpen}
                />
              </AlertDialog>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentStep === 1}
                  onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                  className="min-h-[44px]"
                >
                  {t("footer.back")}
                </Button>

                {currentStep < 4 ? (
                  <Button
                    size="sm"
                    onClick={handleStepAction}
                    className="min-h-[44px] min-w-[80px]"
                  >
                    {t("footer.next")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="min-h-[44px] min-w-[120px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {t("footer.saving")}
                      </>
                    ) : (
                      t("footer.submit")
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom spacer for fixed footer on mobile */}
          <div className="h-14 lg:hidden" />
        </div>

        {/* ─�� Desktop summary sidebar (steps 1-3 only, step 4 shows inline) ── */}
        {currentStep < 4 && (
          <div className="hidden lg:block lg:col-span-1 lg:col-start-4 -mt-[calc(theme(spacing.6)+1px)]">
            {/* Invisible placeholder — summary is already the 4th col */}
          </div>
        )}
      </div>

      {/* Desktop summary card pinned to right (steps 1-3) */}
      {currentStep < 4 && (
        <div
          className="hidden lg:block fixed"
          style={{
            // Align with 4th grid column — approximate
            right: "max(calc((100vw - 1536px) / 2 + 16px), 16px)",
            top: "200px",
            width: "260px",
          }}
        >
          <SummaryCard />
        </div>
      )}
    </>
  );
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
