"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  User,
  Briefcase,
  ShieldCheck,
  Send,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { PageHeader, ConfirmDialog } from "@/components/shared";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  createUser,
  getStores,
  getPositions,
  getAgents,
  type UserCreateData,
  type InviteMethod,
  type StoreWithStats,
  type PositionWithCounts,
} from "@/lib/api";
import type { Agent } from "@/lib/types";
import type { Permission } from "@/lib/types";

import {
  buildStep1Schema,
  buildStep2Schema,
  buildStep3Schema,
  buildStep4Schema,
  buildInviteTemplate,
  DEFAULT_COUNTRY,
  type PhoneCountry,
  type WizardValues,
} from "./employee-create-wizard/_shared";
import { VerticalStepper, HorizontalStepper, type StepMeta } from "./employee-create-wizard/stepper";
import { SummaryCard } from "./employee-create-wizard/summary-card";
import { StepPersonal } from "./employee-create-wizard/step-personal";

// ── Non-default wizard steps: lazy-loaded on advance ──────────────────────────
const StepSkeleton = () => (
  <div className="h-64 animate-pulse rounded-md bg-muted/50" />
);

const StepPosition = dynamic(
  () => import("./employee-create-wizard/step-position").then((m) => m.StepPosition),
  { loading: () => <StepSkeleton /> },
);
const StepPermissions = dynamic(
  () => import("./employee-create-wizard/step-permissions").then((m) => m.StepPermissions),
  { loading: () => <StepSkeleton /> },
);
const StepInvite = dynamic(
  () => import("./employee-create-wizard/step-invite").then((m) => m.StepInvite),
  { loading: () => <StepSkeleton /> },
);

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
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(DEFAULT_COUNTRY);
  const [, setLoadingData] = useState(true);
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  // Payment mode for the demo org — determines agent field visibility
  const [isNominalAccount, setIsNominalAccount] = useState(true);

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
      invite_message:
        masterValues.invite_message ??
        buildInviteTemplate({ vals: masterValues }),
      notify_manager: masterValues.notify_manager ?? false,
    },
  });

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
      const storeName = stores.find((s) => s.id === merged.store_id)?.name;
      const template = buildInviteTemplate({ vals: merged, storeName });
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

  // ── Summary watch values ─────────────────────────────────────────────────────
  const s1Watch = form1.watch();
  const s2Watch = form2.watch();
  const s3Watch = form3.watch();
  const s4Watch = form4.watch();

  const summaryFio = [s1Watch.last_name, s1Watch.first_name, s1Watch.middle_name]
    .filter(Boolean)
    .join(" ");

  // ── Steps meta ────────────────────────────────────────────────────────────────
  const steps: StepMeta[] = [
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
  const summaryCard = (
    <SummaryCard
      t={t}
      s1Watch={s1Watch}
      s2Watch={s2Watch}
      s3Watch={s3Watch}
      s4Watch={s4Watch}
      masterValues={masterValues}
      stores={stores}
      positions={positions}
      agents={agents}
      isNominalAccount={isNominalAccount}
    />
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
        <VerticalStepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />

        {/* ── Right: form card (col-span-3) ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <HorizontalStepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />

          {/* Step card */}
          <Card className="rounded-xl border border-border">
            <CardContent className="p-4 md:p-6">
              {currentStep === 1 && (
                <StepPersonal
                  form={form1}
                  t={t}
                  phoneCountry={phoneCountry}
                  onPhoneCountryChange={setPhoneCountry}
                  avatarPreview={avatarPreview}
                  onAvatarPreviewChange={setAvatarPreview}
                  onSubmit={handleStepAction}
                  summaryFio={summaryFio}
                />
              )}

              {currentStep === 2 && (
                <StepPosition
                  form={form2}
                  t={t}
                  tCommon={tCommon}
                  stores={stores}
                  positions={positions}
                  agents={agents}
                  isNominalAccount={isNominalAccount}
                  masterValues={masterValues}
                  onMasterValuesChange={setMasterValues}
                  onSubmit={handleStepAction}
                />
              )}

              {currentStep === 3 && (
                <StepPermissions
                  form={form3}
                  t={t}
                  isManagerPosition={isManagerPosition}
                  onSubmit={handleStepAction}
                />
              )}

              {currentStep === 4 && (
                <StepInvite
                  form={form4}
                  t={t}
                  hasEmail={!!s1Watch.email}
                  onSubmit={handleStepAction}
                  summarySlot={summaryCard}
                />
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
                  {summaryCard}
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

        {/* ── Desktop summary sidebar (steps 1-3 only, step 4 shows inline) ── */}
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
          {summaryCard}
        </div>
      )}
    </>
  );
}
