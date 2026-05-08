"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Agent } from "@/lib/types";
import { updateAgent } from "@/lib/api/freelance-agents";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface EditSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent: Agent;
  onSaved: (updated: Partial<Agent>) => void;
  t: ReturnType<typeof useTranslations>;
}

export function EditSheet({ open, onOpenChange, agent, onSaved, t }: EditSheetProps) {
  const [form, setForm] = React.useState({
    name: agent.name,
    inn: agent.inn ?? "",
    kpp: agent.kpp ?? "",
    ogrn: agent.ogrn ?? "",
    contact_person_name: agent.contact_person_name ?? "",
    contact_phone: agent.contact_phone ?? "",
    contact_email: agent.contact_email ?? "",
    commission_pct: String(agent.commission_pct),
    contract_url: agent.contract_url ?? "",
    contract_signed_at: agent.contract_signed_at ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  // sync form when agent changes (e.g. after save)
  React.useEffect(() => {
    setForm({
      name: agent.name,
      inn: agent.inn ?? "",
      kpp: agent.kpp ?? "",
      ogrn: agent.ogrn ?? "",
      contact_person_name: agent.contact_person_name ?? "",
      contact_phone: agent.contact_phone ?? "",
      contact_email: agent.contact_email ?? "",
      commission_pct: String(agent.commission_pct),
      contract_url: agent.contract_url ?? "",
      contract_signed_at: agent.contract_signed_at ?? "",
    });
  }, [agent]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Partial<Agent> = {
        name: form.name,
        inn: form.inn || undefined,
        kpp: form.kpp || undefined,
        ogrn: form.ogrn || undefined,
        contact_person_name: form.contact_person_name || undefined,
        contact_phone: form.contact_phone || undefined,
        contact_email: form.contact_email || undefined,
        commission_pct: Number(form.commission_pct),
        contract_url: form.contract_url || null,
        contract_signed_at: form.contract_signed_at || null,
      };
      const res = await updateAgent(agent.id, payload);
      if (res.success) {
        toast.success(t("toasts.saved"));
        onSaved(payload);
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("edit_sheet.title")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          {(
            [
              { key: "name", label: t("edit_sheet.field_name"), type: "text" },
              { key: "inn", label: t("edit_sheet.field_inn"), type: "text" },
              { key: "kpp", label: t("edit_sheet.field_kpp"), type: "text" },
              { key: "ogrn", label: t("edit_sheet.field_ogrn"), type: "text" },
              { key: "contact_person_name", label: t("edit_sheet.field_contact_person"), type: "text" },
              { key: "contact_phone", label: t("edit_sheet.field_phone"), type: "tel" },
              { key: "contact_email", label: t("edit_sheet.field_email"), type: "email" },
              { key: "commission_pct", label: t("edit_sheet.field_commission"), type: "number" },
              { key: "contract_url", label: t("edit_sheet.field_contract_url"), type: "url" },
              { key: "contract_signed_at", label: t("edit_sheet.field_contract_signed_at"), type: "date" },
            ] as { key: keyof typeof form; label: string; type: string }[]
          ).map(({ key, label, type }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-${key}`}>{label}</Label>
              <Input
                id={`edit-${key}`}
                type={type}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                min={type === "number" ? 0 : undefined}
                max={type === "number" ? 100 : undefined}
                step={type === "number" ? 0.1 : undefined}
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
