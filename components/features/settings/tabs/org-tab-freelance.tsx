"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Loader2, Lock } from "lucide-react";

import { Link } from "@/i18n/navigation";
import {
  getOrganizationFreelanceConfig,
  updatePaymentMode,
  type FreelanceConfig,
} from "@/lib/api/freelance-config";
import type { PaymentMode } from "@/lib/types";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

function FreelanceSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface PaymentModeFieldProps {
  config: FreelanceConfig;
  localPaymentMode: PaymentMode;
  onModeChange: (mode: PaymentMode) => void;
  onSaveRequest: () => void;
  saving: boolean;
  isPlatformAdmin: boolean;
  t: ReturnType<typeof useTranslations<"screen.organizationSettings">>;
}

function PaymentModeField({
  config,
  localPaymentMode,
  onModeChange,
  onSaveRequest,
  saving,
  isPlatformAdmin,
  t,
}: PaymentModeFieldProps) {
  const modeLabel: Record<PaymentMode, string> = {
    NOMINAL_ACCOUNT: t("freelance_section.payment_mode_NOMINAL_ACCOUNT"),
    CLIENT_DIRECT: t("freelance_section.payment_mode_CLIENT_DIRECT"),
  };

  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          {t("freelance_section.payment_mode_label")}
        </span>
        <Badge variant="secondary" className="w-fit">
          {modeLabel[config.payment_mode]}
        </Badge>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-0.5">
          <Lock className="size-3 shrink-0 mt-0.5" aria-hidden="true" />
          {t("freelance_section.payment_mode_locked_hint")}
        </p>
      </div>
    );
  }

  const isDirty = localPaymentMode !== config.payment_mode;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-foreground">
        {t("freelance_section.payment_mode_label")}
      </span>
      <RadioGroup
        value={localPaymentMode}
        onValueChange={(v) => onModeChange(v as PaymentMode)}
        className="gap-3"
      >
        {(["NOMINAL_ACCOUNT", "CLIENT_DIRECT"] as PaymentMode[]).map((mode) => (
          <div key={mode} className="flex items-center gap-2">
            <RadioGroupItem value={mode} id={`payment-mode-${mode}`} />
            <Label
              htmlFor={`payment-mode-${mode}`}
              className="cursor-pointer text-sm font-normal"
            >
              {modeLabel[mode]}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!isDirty || saving}
          onClick={onSaveRequest}
          className="w-fit"
        >
          {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
          {t("save_bar.save")}
        </Button>
        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => onModeChange(config.payment_mode)}
          >
            {t("save_bar.cancel")}
          </Button>
        )}
      </div>
    </div>
  );
}

interface OrgTabFreelanceProps {
  isPlatformAdmin: boolean;
}

export function OrgTabFreelance({ isPlatformAdmin }: OrgTabFreelanceProps) {
  const t = useTranslations("screen.organizationSettings");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FreelanceConfig | null>(null);
  const [localPaymentMode, setLocalPaymentMode] = useState<PaymentMode>("NOMINAL_ACCOUNT");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    return getOrganizationFreelanceConfig()
      .then(({ data }) => {
        setConfig(data);
        setLocalPaymentMode(data.payment_mode);
      })
      .catch(() => setError(t("toasts.error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOrganizationFreelanceConfig()
      .then(({ data }) => {
        if (cancelled) return;
        setConfig(data);
        setLocalPaymentMode(data.payment_mode);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t("toasts.error"));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleConfirmSave() {
    if (!config) return;
    setSaving(true);
    try {
      const result = await updatePaymentMode(localPaymentMode);
      if (result.success) {
        setConfig((prev) => prev ? { ...prev, payment_mode: localPaymentMode } : prev);
        toast.success(t("toasts.payment_mode_changed"));
      } else {
        toast.error(t("toasts.error"));
        setLocalPaymentMode(config.payment_mode);
      }
    } catch {
      toast.error(t("toasts.error"));
      setLocalPaymentMode(config.payment_mode);
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-4">
          {error}
          <Button variant="outline" size="sm" onClick={() => load()}>
            {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !config) return <FreelanceSectionSkeleton />;

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {t("freelance_section.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PaymentModeField
            config={config}
            localPaymentMode={localPaymentMode}
            onModeChange={setLocalPaymentMode}
            onSaveRequest={() => setConfirmOpen(true)}
            saving={saving}
            isPlatformAdmin={isPlatformAdmin}
            t={t}
          />

          <Separator />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              {t("freelance_section.external_hr_label")}
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              {config.external_hr_enabled ? (
                <Badge className="bg-success text-success-foreground w-fit">
                  {t("freelance_section.external_hr_connected")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="w-fit">
                  {t("freelance_section.external_hr_disconnected")}
                </Badge>
              )}
              <Link
                href={ADMIN_ROUTES.integrations}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t("freelance_section.external_hr_manage_link")}
                <ExternalLink className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              {t("freelance_section.freelance_module_label")}
            </span>
            <Badge className="bg-success text-success-foreground w-fit">
              {t("freelance_section.freelance_module_on")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        title={t("platform_admin.edit_payment_mode_warning_title")}
        message={t("platform_admin.edit_payment_mode_warning_description")}
        confirmLabel={t("platform_admin.edit_payment_mode_confirm")}
        cancelLabel={t("save_bar.cancel")}
        variant="destructive"
        onConfirm={handleConfirmSave}
        onOpenChange={setConfirmOpen}
      />
    </AlertDialog>
  );
}
