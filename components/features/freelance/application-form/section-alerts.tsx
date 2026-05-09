"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, Clock, History } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

interface AlertsProps {
  isDirector: boolean;
  isSupervisorPlus: boolean;
  directorTooEarly: boolean;
  retroactive: boolean;
  urgent: boolean;
  watchedDate: Date | undefined;
  watchedStoreId: number | undefined;
  hasBudgetLimit: boolean | null;
  loadingBudget: boolean;
}

export function Alerts({
  isDirector,
  isSupervisorPlus,
  directorTooEarly,
  retroactive,
  urgent,
  watchedDate,
  watchedStoreId,
  hasBudgetLimit,
  loadingBudget,
}: AlertsProps) {
  const t = useTranslations("screen.freelanceApplicationNew");

  return (
    <>
      {/* STORE_DIRECTOR: date too early — blocking destructive */}
      {isDirector && directorTooEarly && watchedDate && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="size-4" />
          <AlertTitle>
            {t("alerts.store_director_too_early_title")}
          </AlertTitle>
          <AlertDescription>
            {t("alerts.store_director_too_early_desc")}
          </AlertDescription>
        </Alert>
      )}

      {/* SUPERVISOR+: retroactive */}
      {isSupervisorPlus && retroactive && watchedDate && (
        <Alert role="alert">
          <History className="size-4" />
          <AlertTitle>{t("alerts.retroactive_title")}</AlertTitle>
          <AlertDescription>{t("alerts.retroactive_desc")}</AlertDescription>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Checkbox
              id="retro-check"
              checked
              tabIndex={-1}
              className="pointer-events-none"
              onCheckedChange={() => {}}
            />
            <label
              htmlFor="retro-check"
              className="cursor-default select-none"
            >
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
            <Checkbox
              id="urgent-check"
              checked
              tabIndex={-1}
              className="pointer-events-none"
              onCheckedChange={() => {}}
            />
            <label
              htmlFor="urgent-check"
              className="cursor-default select-none"
            >
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
    </>
  );
}
