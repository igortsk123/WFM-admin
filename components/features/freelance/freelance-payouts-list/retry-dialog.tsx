"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface RetryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  retrying: boolean;
}

export function RetryDialog({
  open,
  onOpenChange,
  onConfirm,
  retrying,
}: RetryDialogProps) {
  const t = useTranslations("screen.freelancePayoutsList");
  const tCommon = useTranslations("common");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("retry_dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("retry_dialog.message")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={retrying}
            className="min-h-10"
          >
            {retrying && <RefreshCw className="size-4 mr-1.5 animate-spin" />}
            {t("retry_dialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
