"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import type { NominalAccountState } from "./_shared";

interface NominalAccountAlertsProps {
  account: NominalAccountState;
}

export function NominalAccountAlerts({ account }: NominalAccountAlertsProps) {
  const t = useTranslations("screen.freelancePayoutsList");

  if (account.status === "NOT_CONNECTED") {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t("alerts.not_connected_title")}</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
          <span>{t("alerts.not_connected_desc")}</span>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="min-h-10"
            asChild
          >
            <a href={`${ADMIN_ROUTES.integrations}#nominal-account`}>
              {t("alerts.not_connected_action")}
            </a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (account.status === "ERROR") {
    return (
      <Alert
        variant="default"
        className="border-warning/50 bg-warning/10 text-warning-foreground"
      >
        <AlertTriangle className="size-4 text-warning" />
        <AlertTitle className="text-warning">{t("alerts.error_title")}</AlertTitle>
        <AlertDescription>
          {t("alerts.error_desc", {
            message: account.last_error ?? "Unknown error",
          })}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
