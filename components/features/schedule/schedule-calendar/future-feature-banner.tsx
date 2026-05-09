"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InformationBanner } from "@/components/shared";

export function FutureFeatureBanner() {
  const t = useTranslations("screen.schedule");
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <InformationBanner
      variant="muted"
      layout="card"
      className="border-dashed border-border/50 bg-card"
      icon={<Sparkles className="size-5" />}
      title={t("grid.future_feature_title")}
      description={t("grid.future_feature_description")}
      action={
        <>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="h-8 text-xs gap-1.5"
          >
            {t("grid.future_feature_cta")}
          </Button>
          <Badge variant="secondary" className="text-xs">
            {t("grid.future_feature_badge")}
          </Badge>
        </>
      }
      onClose={() => setDismissed(true)}
      closeLabel="Dismiss"
    />
  );
}
