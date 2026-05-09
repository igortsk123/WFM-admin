"use client";

import * as React from "react";
import { toast } from "sonner";

import type { ObjectFormat, ServiceNorm, ServiceNormUnit } from "@/lib/types";
import { createServiceNorm, updateServiceNorm } from "@/lib/api/freelance-norms";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  makeDefaultForm,
  type Currency,
  type NormFormState,
  type TFn,
} from "./_shared";
import { NormFormBody } from "./section-norm-form-body";

interface NormSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ServiceNorm | null;
  defaultCurrency: Currency;
  onSuccess: () => void;
  t: TFn;
  tFreelance: TFn;
}

export function NormSheet({
  open,
  onOpenChange,
  editing,
  defaultCurrency,
  onSuccess,
  t,
  tFreelance,
}: NormSheetProps) {
  const [form, setForm] = React.useState<NormFormState>(() =>
    makeDefaultForm(defaultCurrency)
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        object_format: editing.object_format,
        work_type_id: String(editing.work_type_id),
        normative_per_hour: String(editing.normative_per_hour),
        unit: editing.unit,
        hourly_rate: editing.hourly_rate != null ? String(editing.hourly_rate) : "",
        currency: editing.currency,
      });
    } else {
      setForm(makeDefaultForm(defaultCurrency));
    }
  }, [open, editing, defaultCurrency]);

  const isValid =
    !!form.object_format &&
    !!form.work_type_id &&
    !!form.normative_per_hour &&
    Number(form.normative_per_hour) > 0 &&
    !!form.unit &&
    (form.hourly_rate === "" || Number(form.hourly_rate) >= 0);

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const wt = MOCK_WORK_TYPES.find((w) => w.id === Number(form.work_type_id));
      const payload: Partial<ServiceNorm> = {
        object_format: form.object_format as ObjectFormat,
        work_type_id: Number(form.work_type_id),
        work_type_name: wt?.name ?? `Тип #${form.work_type_id}`,
        normative_per_hour: Number(form.normative_per_hour),
        unit: form.unit as ServiceNormUnit,
        hourly_rate: form.hourly_rate !== "" ? Number(form.hourly_rate) : null,
        currency: form.currency,
      };

      const result = editing
        ? await updateServiceNorm(editing.id, payload)
        : await createServiceNorm(payload);

      if (result.success) {
        toast.success(editing ? t("toasts.updated") : t("toasts.created"));
        onSuccess();
        onOpenChange(false);
      } else if (result.error?.code === "DUPLICATE") {
        toast.error(t("toasts.duplicate"));
      } else {
        toast.error(t("toasts.error"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="border-b px-5 py-4 shrink-0">
          <SheetTitle>
            {editing ? t("form.edit_title") : t("form.create_title")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <NormFormBody
            form={form}
            onChange={setForm}
            tFreelance={tFreelance}
            t={t}
          />
        </div>

        <SheetFooter className="border-t px-5 py-3 shrink-0 flex flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            className="flex-1 h-11"
            disabled={!isValid || saving}
            onClick={handleSave}
          >
            {saving ? "..." : t("actions.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
