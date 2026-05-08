"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/shared";

interface Props {
  mode: "create" | "edit";
  isSubmitting: boolean;
  showCancelConfirm: boolean;
  setShowCancelConfirm: (v: boolean) => void;
  handleCancel: () => void;
  handleSaveAndAddAnother: () => void;
  onConfirmCancel: () => void;
}

export function TaskFormFooter({
  mode,
  isSubmitting,
  showCancelConfirm,
  setShowCancelConfirm,
  handleCancel,
  handleSaveAndAddAnother,
  onConfirmCancel,
}: Props) {
  const t = useTranslations("screen.taskForm");
  const tCommon = useTranslations("common");

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-width,0px)] z-40 bg-background border-t border-border px-4 py-3 flex items-center justify-end gap-2">
      {/* Cancel with confirm dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="h-10 min-w-[80px]"
          >
            {t("btn_cancel")}
          </Button>
        </AlertDialogTrigger>
        <ConfirmDialog
          title={t("cancel_confirm_title")}
          message={t("cancel_confirm_message")}
          confirmLabel={t("cancel_confirm_leave")}
          cancelLabel={tCommon("cancel")}
          onConfirm={onConfirmCancel}
          onOpenChange={setShowCancelConfirm}
        />
      </AlertDialog>

      {/* Save & Add Another (create only, hidden on mobile) */}
      {mode === "create" && (
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={handleSaveAndAddAnother}
          className="h-10 hidden md:flex"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t("btn_save_add_another")}
        </Button>
      )}

      {/* Primary save */}
      <Button type="submit" disabled={isSubmitting} className="h-10 min-w-[100px]">
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {t("btn_save")}
      </Button>
    </div>
  );
}
