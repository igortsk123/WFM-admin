"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function FutureFeatureBanner() {
  const t = useTranslations("screen.schedule");
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <Card className="border-dashed border-border/50 relative">
      <CardContent className="p-4 flex items-start gap-3">
        <Sparkles
          className="size-5 text-muted-foreground shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t("grid.future_feature_title")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t("grid.future_feature_description")}
          </p>
          <div className="flex items-center gap-2 mt-2">
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
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute top-3 right-3 size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <X className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </CardContent>
    </Card>
  );
}
