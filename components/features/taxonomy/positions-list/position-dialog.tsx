"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import type { PositionWithCounts } from "@/lib/api/taxonomy";

import { PositionFormBody } from "./position-form-body";
import { usePositionForm } from "./use-position-form";
import type { TFn } from "./_shared";

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PositionWithCounts | null;
  onSuccess: () => void;
  t: TFn;
  tRole: TFn;
}

export function PositionDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
  t,
  tRole,
}: PositionDialogProps) {
  const {
    form,
    setForm,
    roleChanged,
    roleChangeAck,
    setRoleChangeAck,
    saving,
    canSave,
    handleSave,
  } = usePositionForm({ open, editing, t, onSuccess, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("dialogs.edit_title", { name: editing.name })
              : t("dialogs.create_title")}
          </DialogTitle>
        </DialogHeader>

        <PositionFormBody
          form={form}
          onChange={setForm}
          editingEmployeesCount={editing?.employees_count ?? 0}
          roleChanged={roleChanged}
          roleChangeAcknowledged={roleChangeAck}
          onAckChange={setRoleChangeAck}
          t={t}
          tRole={tRole}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? "..." : t("dialogs.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
