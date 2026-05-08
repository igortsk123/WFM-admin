"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Code, ExternalLink } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import type { IntegrationsStatus } from "@/lib/api/integrations";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { StatItem } from "./_shared";

interface ApiKeysCardProps {
  status: IntegrationsStatus;
}

export function ApiKeysCard({ status }: ApiKeysCardProps) {
  const t = useTranslations("screen.integrations");

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground shrink-0">
            <Code className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{t("cards.api_keys.title")}</p>
            <p className="text-xs text-muted-foreground leading-snug">{t("cards.api_keys.description")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <div className="grid grid-cols-2 gap-3">
          <StatItem label={t("cards.api_keys.stat_keys")} value={status.api_keys_count} />
          <StatItem label={t("cards.api_keys.stat_requests")} value={status.api_requests_today ?? "—"} />
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t border-border pt-3">
        <Button asChild variant="outline" size="sm">
          <Link href={ADMIN_ROUTES.settingsOrganization + "?tab=api-keys"}>{t("cards.api_keys.manage")}</Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <ExternalLink className="size-3.5" />
          {t("cards.api_keys.docs")}
        </Button>
      </CardFooter>
    </Card>
  );
}
