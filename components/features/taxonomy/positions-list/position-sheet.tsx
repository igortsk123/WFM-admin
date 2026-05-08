"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

import type { PositionWithCounts } from "@/lib/api/taxonomy";

import { PositionFormBody } from "./position-form-body";
import { usePositionForm } from "./use-position-form";
import type { TFn } from "./_shared";

interface PositionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PositionWithCounts | null;
  onSuccess: () => void;
  t: TFn;
  tRole: TFn;
}

export function PositionSheet({
  open,
  onOpenChange,
  editing,
  onSuccess,
  t,
  tRole,
}: PositionSheetProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95dvh] flex flex-col p-0 rounded-t-xl"
      >
        <SheetHeader className="border-b px-4 py-3 shrink-0">
          <SheetTitle>
            {editing
              ? t("dialogs.edit_title", { name: editing.name })
              : t("dialogs.create_title")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
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
        </div>

        <SheetFooter className="sticky bottom-0 h-14 border-t bg-background flex flex-row gap-2 px-4 py-2 shrink-0">
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={() => onOpenChange(false)}
          >
            {t("dialogs.cancel")}
          </Button>
          <Button
            className="flex-1 h-10"
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? "..." : t("dialogs.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
