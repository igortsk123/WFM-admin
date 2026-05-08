"use client";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { TCommonFn, TFn } from "./_shared";

export interface ForbiddenStateProps {
  onBack: () => void;
  t: TFn;
  tCommon: TCommonFn;
}

export function ForbiddenState({ onBack, t, tCommon }: ForbiddenStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
        <Lock className="size-8 text-muted-foreground" strokeWidth={1.5} />
      </span>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {t("forbidden.title")}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {t("forbidden.description")}
      </p>
      <Button variant="outline" className="mt-6" onClick={onBack}>
        {tCommon("back")}
      </Button>
    </div>
  );
}
