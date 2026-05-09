"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ActionsProps {
  isSubmitting: boolean;
  submitDisabled: boolean;
  onCancel: () => void;
}

export function Actions({
  isSubmitting,
  submitDisabled,
  onCancel,
}: ActionsProps) {
  const t = useTranslations("screen.freelanceApplicationNew");

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:static sticky bottom-0 bg-background pt-3 pb-safe border-t border-border md:border-0 md:pt-0 md:pb-0 md:bg-transparent -mx-6 px-6 md:mx-0 md:px-0">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="min-h-[44px] sm:min-h-0"
      >
        {t("form.cancel")}
      </Button>
      <Button
        type="submit"
        disabled={submitDisabled}
        className="min-h-[44px] sm:min-h-0"
      >
        {isSubmitting && (
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        )}
        {t("form.submit")}
      </Button>
    </div>
  );
}
