"use client";

import { useTranslations, useLocale } from "next-intl";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatDate } from "@/lib/utils/format";

import type { ApplicationDetailData } from "./types";

export function TerminalSidebar({ app }: { app: ApplicationDetailData }) {
  const t = useTranslations("screen.freelanceApplicationDetail.terminal_block");
  const locale = useLocale();

  const titleKey =
    app.status === "REJECTED"
      ? "rejected_title"
      : app.status === "REPLACED_WITH_BONUS" || app.status === "MIXED"
      ? "bonus_title"
      : "cancelled_title";

  return (
    <Card>
      <CardContent className="pt-5 flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">{t(titleKey)}</p>
        {app.decision_comment && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              {t("reason_label")}
            </p>
            <p className="text-sm text-foreground">{app.decision_comment}</p>
          </div>
        )}
        {app.decided_by_name && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("decided_by")}: {app.decided_by_name}</span>
            {app.decided_at && (
              <span>
                {formatDate(new Date(app.decided_at), locale as "ru" | "en")}
              </span>
            )}
          </div>
        )}
        {(app.status === "REPLACED_WITH_BONUS" || app.status === "MIXED") &&
          app.replaced_with_bonus_budget_id && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              asChild
            >
              <a
                href={`${ADMIN_ROUTES.bonusTasks}?budget_id=${app.replaced_with_bonus_budget_id}`}
              >
                <ExternalLink className="size-3.5" />
                {t("go_bonus_pool")}
              </a>
            </Button>
          )}
      </CardContent>
    </Card>
  );
}
