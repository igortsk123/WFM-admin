"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Lock, RefreshCw } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

import {
  getOrganizationConfig,
  updateOrganizationConfig,
  updateBrandingConfig,
  updateTaskPolicies,
  updateTimezoneConfig,
  getTaskPolicies,
  getTimezoneConfig,
  getBrandingConfig,
  getLegalEntities,
} from "@/lib/api/organization";
import type {
  OrganizationConfig,
  TaskPoliciesConfig,
  TimezoneConfig,
  BrandingConfig,
} from "@/lib/api/organization";
import type { LegalEntity } from "@/lib/types";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";

import { OrgTabGeneral, type GeneralFormValues } from "./tabs/org-tab-general";
import { OrgTabAiStandards } from "./tabs/org-tab-ai-standards";
import { OrgTabLegal } from "./tabs/org-tab-legal";
import { OrgTabBranding } from "./tabs/org-tab-branding";
import { OrgTabPolicies, type PoliciesFormValues } from "./tabs/org-tab-policies";
import { OrgTabTimezone, type TimezoneFormValues } from "./tabs/org-tab-timezone";
import { OrgTabApi } from "./tabs/org-tab-api";
import { OrgTabBilling } from "./tabs/org-tab-billing";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId =
  | "general"
  | "ai_standards"
  | "legal"
  | "branding"
  | "policies"
  | "timezone"
  | "api"
  | "billing";

// ─── Sticky save bar ──────────────────────────────────────────────────────────

interface SaveBarProps {
  visible: boolean;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function SaveBar({ visible, submitting, onSave, onCancel }: SaveBarProps) {
  const t = useTranslations("screen.organizationSettings");
  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 left-0 md:left-60 z-50",
        "h-14 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "flex items-center justify-between px-4 md:px-6 gap-4"
      )}
      role="status"
      aria-live="polite"
      aria-label={t("save_bar.dirty_message")}
    >
      <p className="text-sm text-muted-foreground hidden sm:block">
        {t("save_bar.dirty_message")}
      </p>
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          {t("save_bar.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={submitting}
          className="min-w-20"
        >
          {submitting ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            t("save_bar.save")
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Forbidden state ──────────────────────────────────────────────────────────

function ForbiddenState() {
  const t = useTranslations("screen.organizationSettings");
  return (
    <EmptyState
      icon={Lock}
      title={t("states.forbidden_title")}
      description={t("states.forbidden_subtitle")}
    />
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrganizationSettings() {
  const t = useTranslations("screen.organizationSettings");
  const { user } = useAuth();

  // Permissions: only NETWORK_OPS
  const canAccess = user.role === "NETWORK_OPS" || user.role === "PLATFORM_ADMIN";

  // Data state
  const [config, setConfig] = React.useState<OrganizationConfig | null>(null);
  const [policiesConfig, setPoliciesConfig] = React.useState<TaskPoliciesConfig | null>(null);
  const [timezoneConfig, setTimezoneConfig] = React.useState<TimezoneConfig | null>(null);
  const [brandingConfig, setBrandingConfig] = React.useState<BrandingConfig | null>(null);
  const [legalEntities, setLegalEntities] = React.useState<LegalEntity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  // Active tab
  const [activeTab, setActiveTab] = React.useState<TabId>("general");

  // Dirty/save state
  const [dirty, setDirty] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Per-tab pending values
  const generalValuesRef = React.useRef<GeneralFormValues | null>(null);
  const policiesValuesRef = React.useRef<PoliciesFormValues | null>(null);
  const timezoneValuesRef = React.useRef<TimezoneFormValues | null>(null);
  const brandingValuesRef = React.useRef<BrandingConfig | null>(null);

  // Per-tab submit callbacks
  const submitCallbacksRef = React.useRef<Partial<Record<TabId, () => Promise<void>>>>({});

  function registerSubmit(tabId: TabId) {
    return (fn: () => Promise<void>) => {
      submitCallbacksRef.current[tabId] = fn;
    };
  }

  // ── Load data ──────────────────────────────────────────────────────────────
  const orgId = user.organization.id;

  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      const [orgRes, policiesRes, tzRes, brandingRes, legalRes] = await Promise.all([
        getOrganizationConfig(orgId),
        getTaskPolicies(orgId),
        getTimezoneConfig(orgId),
        getBrandingConfig(orgId),
        getLegalEntities(orgId),
      ]);
      setConfig(orgRes.data);
      setPoliciesConfig(policiesRes.data);
      setTimezoneConfig(tzRes.data);
      setBrandingConfig(brandingRes.data);
      setLegalEntities(legalRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (canAccess) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  // ── Save handler ────────────────────────────────────────────���────────────

  async function handleSave() {
    setSubmitting(true);
    try {
      const savePromises: Promise<unknown>[] = [];

      // Run current tab's submit callback (form.reset etc.)
      const tabSubmit = submitCallbacksRef.current[activeTab];
      if (tabSubmit) await tabSubmit();

      if (activeTab === "general" && generalValuesRef.current) {
        savePromises.push(
          updateOrganizationConfig(orgId, generalValuesRef.current)
        );
      }

      if (activeTab === "policies" && policiesValuesRef.current) {
        savePromises.push(
          updateTaskPolicies(orgId, policiesValuesRef.current)
        );
      }

      if (activeTab === "timezone" && timezoneValuesRef.current) {
        savePromises.push(
          updateTimezoneConfig(orgId, timezoneValuesRef.current)
        );
      }

      if (activeTab === "branding" && brandingValuesRef.current) {
        savePromises.push(
          updateBrandingConfig(orgId, brandingValuesRef.current)
        );
      }

      await Promise.all(savePromises);
      toast.success(t("toasts.saved"));
      setDirty(false);
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    // Reload data to reset forms
    loadData();
    setDirty(false);
  }

  // ── Tab switch: warn if dirty ─────────────────────────────────────────────

  function handleTabChange(tab: string) {
    // Reset dirty on tab switch to avoid stale state confusion
    if (dirty) setDirty(false);
    setActiveTab(tab as TabId);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!canAccess) {
    return (
      <div className="space-y-6 pb-16">
        <PageHeader
          title={t("page_title")}
          breadcrumbs={[
            { label: t("breadcrumbs.settings") },
            { label: t("breadcrumbs.organization") },
          ]}
        />
        <ForbiddenState />
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  if (error || !config) {
    return (
      <div className="space-y-4 pb-16">
        <PageHeader title={t("page_title")} />
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{t("toasts.error")}</span>
            <Button variant="outline" size="sm" onClick={loadData} className="ml-4 shrink-0">
              <RefreshCw className="size-4 mr-1" />
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "general",      label: t("tabs.general") },
    { id: "ai_standards", label: t("tabs.ai_standards") },
    { id: "legal",        label: t("tabs.legal") },
    { id: "branding",     label: t("tabs.branding") },
    { id: "policies",     label: t("tabs.policies") },
    { id: "timezone",     label: t("tabs.timezone") },
    { id: "api",          label: t("tabs.api") },
    { id: "billing",      label: t("tabs.billing") },
  ];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.settings") },
          { label: t("breadcrumbs.organization") },
        ]}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Tab list — horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="flex w-max min-w-full md:w-auto md:min-w-0 bg-muted/50 h-auto gap-0.5 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="shrink-0 text-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab bodies */}
        <div className="mt-4">
          <TabsContent value="general" forceMount className={activeTab !== "general" ? "hidden" : ""}>
            <OrgTabGeneral
              config={config}
              onDirty={() => setDirty(true)}
              onClean={() => setDirty(false)}
              onValuesChange={(v) => { generalValuesRef.current = v; }}
              registerSubmit={registerSubmit("general")}
            />
          </TabsContent>

          <TabsContent value="ai_standards" forceMount className={activeTab !== "ai_standards" ? "hidden" : ""}>
            <OrgTabAiStandards orgId={orgId} config={config} />
          </TabsContent>

          <TabsContent value="legal" forceMount className={activeTab !== "legal" ? "hidden" : ""}>
            <OrgTabLegal orgId={orgId} initialEntities={legalEntities} />
          </TabsContent>

          <TabsContent value="branding" forceMount className={activeTab !== "branding" ? "hidden" : ""}>
            {brandingConfig && (
              <OrgTabBranding
                branding={brandingConfig}
                orgName={config.name}
                onDirty={() => setDirty(true)}
                onClean={() => setDirty(false)}
                onValuesChange={(v) => { brandingValuesRef.current = v; }}
                registerSubmit={registerSubmit("branding")}
              />
            )}
          </TabsContent>

          <TabsContent value="policies" forceMount className={activeTab !== "policies" ? "hidden" : ""}>
            {policiesConfig && (
              <OrgTabPolicies
                config={policiesConfig}
                onDirty={() => setDirty(true)}
                onClean={() => setDirty(false)}
                onValuesChange={(v) => { policiesValuesRef.current = v; }}
                registerSubmit={registerSubmit("policies")}
              />
            )}
          </TabsContent>

          <TabsContent value="timezone" forceMount className={activeTab !== "timezone" ? "hidden" : ""}>
            {timezoneConfig && (
              <OrgTabTimezone
                config={timezoneConfig}
                onDirty={() => setDirty(true)}
                onClean={() => setDirty(false)}
                onValuesChange={(v) => { timezoneValuesRef.current = v; }}
                registerSubmit={registerSubmit("timezone")}
              />
            )}
          </TabsContent>

          <TabsContent value="api" forceMount className={activeTab !== "api" ? "hidden" : ""}>
            <OrgTabApi orgId={orgId} />
          </TabsContent>

          <TabsContent value="billing" forceMount className={activeTab !== "billing" ? "hidden" : ""}>
            <OrgTabBilling orgId={orgId} />
          </TabsContent>
        </div>
      </Tabs>

      <SaveBar
        visible={dirty}
        submitting={submitting}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
