import { useState } from "react";

import { ConfirmDialog } from "@/components/shared";

import type { GoalsT, CommonT } from "./_shared";

export function RemoveGoalDialogContent({
  t,
  tCommon,
  onConfirm,
  onOpenChange,
}: {
  t: GoalsT;
  tCommon: CommonT;
  onConfirm: (reason: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm(reason || "Без комментария");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfirmDialog
      title={t("remove_dialog.title")}
      message={t("remove_dialog.description")}
      confirmLabel={loading ? "..." : t("remove_dialog.confirm")}
      cancelLabel={tCommon("cancel")}
      variant="destructive"
      onConfirm={handleConfirm}
      onOpenChange={onOpenChange}
    />
  );
}
