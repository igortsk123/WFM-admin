"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";

import { PageHeader } from "@/components/shared";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { Actions } from "./application-form/section-actions";
import { Alerts } from "./application-form/section-alerts";
import { CostPreview } from "./application-form/section-cost-preview";
import { FormFields } from "./application-form/section-form-fields";
import { useApplicationForm } from "./application-form/use-application-form";

export function ApplicationForm() {
  const t = useTranslations("screen.freelanceApplicationNew");

  const {
    isDirector,
    isSupervisorPlus,
    isClientDirect,
    moduleEnabled,

    form,
    onSubmit,

    availableStores,
    selectedStore,

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
    submitDisabled,

    onCancel,
  } = useApplicationForm();

  // ── Module disabled guard ──────────────────────────────────────────────────
  if (!moduleEnabled) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
        {t("module_disabled")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          {
            label: t("breadcrumbs.freelance"),
            href: ADMIN_ROUTES.freelanceDashboard,
          },
          {
            label: t("breadcrumbs.applications"),
            href: ADMIN_ROUTES.freelanceApplications,
          },
          { label: t("breadcrumbs.new") },
        ]}
      />

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
              >
                <FormFields
                  form={form}
                  isDirector={isDirector}
                  availableStores={availableStores}
                  selectedStore={selectedStore}
                  watchedStoreId={watchedStoreId}
                  workTypeOptions={workTypeOptions}
                  loadingNorms={loadingNorms}
                />

                <Alerts
                  isDirector={isDirector}
                  isSupervisorPlus={isSupervisorPlus}
                  directorTooEarly={directorTooEarly}
                  retroactive={retroactive}
                  urgent={urgent}
                  watchedDate={watchedDate}
                  watchedStoreId={watchedStoreId}
                  hasBudgetLimit={hasBudgetLimit}
                  loadingBudget={loadingBudget}
                />

                <CostPreview
                  hourlyRate={hourlyRate}
                  estimatedCost={estimatedCost}
                  watchedHours={watchedHours}
                  watchedWorkTypeId={watchedWorkTypeId}
                  loadingNorms={loadingNorms}
                  isClientDirect={isClientDirect}
                  loadingBudget={loadingBudget}
                  budgetUsage={budgetUsage}
                  budgetPct={budgetPct}
                  budgetTrackColor={budgetTrackColor}
                />

                <Actions
                  isSubmitting={isSubmitting}
                  submitDisabled={submitDisabled}
                  onCancel={onCancel}
                />
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
