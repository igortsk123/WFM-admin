"use client";

import { useTranslations } from "next-intl";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import type { ZoneWithCounts } from "@/lib/api/taxonomy";

import { ZoneCard } from "./zone-card";

interface ZoneCardWithDeleteProps {
  zone: ZoneWithCounts;
  showStoreBadge?: boolean;
  deleteAlertOpen: boolean;
  deleteTargetId: number | null;
  onCloseDeleteAlert: () => void;
  onEdit: (zone: ZoneWithCounts) => void;
  onDelete: (zone: ZoneWithCounts) => void;
  onConfirmDelete: () => void;
  onAlertOpenChange: (open: boolean) => void;
}

export function ZoneCardWithDelete({
  zone,
  showStoreBadge = false,
  deleteAlertOpen,
  deleteTargetId,
  onCloseDeleteAlert,
  onEdit,
  onDelete,
  onConfirmDelete,
  onAlertOpenChange,
}: ZoneCardWithDeleteProps) {
  const t = useTranslations("screen.zones");

  return (
    <AlertDialog
      open={deleteAlertOpen && deleteTargetId === zone.id}
      onOpenChange={(open) => {
        if (!open) onCloseDeleteAlert();
      }}
    >
      <ZoneCard
        zone={zone}
        showStoreBadge={showStoreBadge}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <ConfirmDialog
        title={t("dialogs.delete_confirm_title", { name: zone.name })}
        message={t("dialogs.delete_confirm_warning")}
        confirmLabel={t("dialogs.delete_action")}
        variant="destructive"
        onConfirm={onConfirmDelete}
        onOpenChange={onAlertOpenChange}
      />
    </AlertDialog>
  );
}
