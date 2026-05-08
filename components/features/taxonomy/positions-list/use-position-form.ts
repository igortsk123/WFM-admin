"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  createPosition,
  updatePosition,
  type PositionWithCounts,
} from "@/lib/api/taxonomy";

import { DEFAULT_FORM, type PositionFormState, type TFn } from "./_shared";

export interface UsePositionFormArgs {
  open: boolean;
  editing: PositionWithCounts | null;
  t: TFn;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function usePositionForm({
  open,
  editing,
  t,
  onSuccess,
  onOpenChange,
}: UsePositionFormArgs) {
  const [form, setForm] = React.useState<PositionFormState>(DEFAULT_FORM);
  const [originalRoleId, setOriginalRoleId] = React.useState<"1" | "2">("1");
  const [roleChangeAck, setRoleChangeAck] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editing) {
        const f: PositionFormState = {
          code: editing.code,
          name: editing.name,
          description: editing.description ?? "",
          role_id: String(editing.role_id) as "1" | "2",
          functional_role_default: editing.functional_role_default ?? "",
          default_rank: String(editing.default_rank ?? 1),
          is_active: editing.is_active ?? true,
        };
        setForm(f);
        setOriginalRoleId(String(editing.role_id) as "1" | "2");
      } else {
        setForm(DEFAULT_FORM);
        setOriginalRoleId("1");
      }
      setRoleChangeAck(false);
    }
  }, [open, editing]);

  const roleChanged = editing !== null && form.role_id !== originalRoleId;
  const needsAck = roleChanged && (editing?.employees_count ?? 0) > 0;
  const canSave =
    !!form.name.trim() &&
    !!form.code.trim() &&
    (!needsAck || roleChangeAck) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        role_id: Number(form.role_id) as 1 | 2,
        functional_role_default: form.functional_role_default || null,
        default_rank: Number(form.default_rank) || 1,
        is_active: form.is_active,
      };
      const result = editing
        ? await updatePosition(editing.id, payload)
        : await createPosition(payload);
      if (result.success) {
        toast.success(editing ? t("toasts.updated") : t("toasts.created"));
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    setForm,
    roleChanged,
    roleChangeAck,
    setRoleChangeAck,
    saving,
    canSave,
    handleSave,
  };
}
