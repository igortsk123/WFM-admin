"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ADMIN_ROUTES } from "@/lib/constants/routes";

import type { ApplicationDetailData } from "./types";

export function RelatedCard({ app }: { app: ApplicationDetailData }) {
  const t = useTranslations("screen.freelanceApplicationDetail.related_card");
  const hasBonus =
    app.status === "REPLACED_WITH_BONUS" || app.status === "MIXED";
  const hasServices =
    app.status === "APPROVED_FULL" ||
    app.status === "APPROVED_PARTIAL" ||
    app.status === "MIXED";

  if (!hasBonus && !hasServices) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {hasBonus && app.replaced_with_bonus_budget_id && (
          <a
            href={`${ADMIN_ROUTES.bonusTasks}?budget_id=${app.replaced_with_bonus_budget_id}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            {t("bonus_pool")} — {app.replaced_with_bonus_budget_id}
          </a>
        )}
        {hasServices && (
          <a
            href={`${ADMIN_ROUTES.freelanceServices}?application_id=${app.id}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            {t("services")}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
