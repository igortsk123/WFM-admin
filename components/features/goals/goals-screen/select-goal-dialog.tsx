import { useState } from "react";

import { ConfirmDialog } from "@/components/shared";
import type { GoalProposal } from "@/lib/api/goals";
import type { Locale } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";

import type { GoalsT, CommonT } from "./_shared";

export function SelectGoalDialogContent({
  goal,
  hasActiveGoal,
  locale,
  t,
  tCommon,
  onConfirm,
  onOpenChange,
}: {
  goal: GoalProposal;
  hasActiveGoal: boolean;
  locale: Locale;
  t: GoalsT;
  tCommon: CommonT;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConfirmDialog
      title={t("proposals.select_confirm_title", {
        title: pickLocalized(goal.title, goal.title_en, locale),
      })}
      message={hasActiveGoal ? t("proposals.select_confirm_replace_warning") : ""}
      confirmLabel={loading ? "..." : t("proposals.select_confirm_button")}
      cancelLabel={tCommon("cancel")}
      variant="default"
      onConfirm={handleConfirm}
      onOpenChange={onOpenChange}
    />
  );
}
