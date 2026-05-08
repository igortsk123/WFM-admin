"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import type { Agent, AgentStatus } from "@/lib/types"
import { createAgent, updateAgent } from "@/lib/api/freelance-agents"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import {
  type AgentFormData,
  type AgentType,
  type SheetMode,
  EMPTY_FORM,
  agentToFormData,
} from "./_shared"

interface AgentSheetProps {
  open: boolean
  mode: SheetMode
  agent: Agent | null
  onClose: () => void
  onSuccess: () => void
}

export function AgentSheet({ open, mode, agent, onClose, onSuccess }: AgentSheetProps) {
  const t = useTranslations("screen.freelanceAgents")
  const [form, setForm] = React.useState<AgentFormData>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Partial<Record<keyof AgentFormData, string>>>({})

  // Populate form when editing
  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && agent) {
        setForm(agentToFormData(agent))
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
    }
  }, [open, mode, agent])

  function set(field: keyof AgentFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof AgentFormData, string>> = {}
    if (!form.name.trim()) errs.name = "Обязательное поле"
    if (!form.inn.trim()) {
      errs.inn = "Обязательное поле"
    } else if (form.type === "COMPANY" && form.inn.length !== 10) {
      errs.inn = "ИНН юр. лица — 10 цифр"
    } else if (form.type === "INDIVIDUAL" && form.inn.length !== 12) {
      errs.inn = "ИНН ИП/физлица — 12 цифр"
    }
    if (form.type === "COMPANY") {
      if (form.kpp && form.kpp.length !== 9) errs.kpp = "КПП — 9 цифр"
      if (form.ogrn && form.ogrn.length !== 13) errs.ogrn = "ОГРН — 13 цифр"
    }
    const pct = Number(form.commission_pct)
    if (isNaN(pct) || pct < 0 || pct > 50) errs.commission_pct = "От 0 до 50"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const payload: Partial<Agent> = {
        name: form.name.trim(),
        type: form.type,
        inn: form.inn.trim() || undefined,
        kpp: form.type === "COMPANY" ? (form.kpp.trim() || undefined) : undefined,
        ogrn: form.type === "COMPANY" ? (form.ogrn.trim() || undefined) : undefined,
        contact_person_name: form.contact_person_name.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
        contract_url: form.contract_url.trim() || null,
        commission_pct: Number(form.commission_pct),
        status: mode === "edit" ? form.status : "ACTIVE",
      }

      const result =
        mode === "create"
          ? await createAgent(payload)
          : await updateAgent(agent!.id, payload)

      if (result.success) {
        toast.success(mode === "create" ? t("toasts.created") : t("toasts.updated"))
        onSuccess()
        onClose()
      } else {
        toast.error(result.error?.message ?? t("toasts.error"))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>
            {mode === "create" ? t("sheet.title_create") : t("sheet.title_edit")}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="af-name">
                {t("sheet.field_name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="af-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("sheet.field_name_placeholder")}
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>{t("sheet.field_type")}</Label>
              <RadioGroup
                value={form.type}
                onValueChange={(v) => set("type", v as AgentType)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="INDIVIDUAL" id="af-type-ind" />
                  <Label htmlFor="af-type-ind" className="font-normal cursor-pointer">
                    {t("type.INDIVIDUAL")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="COMPANY" id="af-type-comp" />
                  <Label htmlFor="af-type-comp" className="font-normal cursor-pointer">
                    {t("type.COMPANY")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* INN */}
            <div className="space-y-1.5">
              <Label htmlFor="af-inn">
                {t("sheet.field_inn")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="af-inn"
                value={form.inn}
                onChange={(e) => set("inn", e.target.value.replace(/\D/g, ""))}
                placeholder={
                  form.type === "COMPANY"
                    ? t("sheet.field_inn_placeholder_company")
                    : t("sheet.field_inn_placeholder_individual")
                }
                maxLength={form.type === "COMPANY" ? 10 : 12}
                inputMode="numeric"
                className={cn(errors.inn && "border-destructive")}
              />
              {errors.inn && (
                <p className="text-xs text-destructive">{errors.inn}</p>
              )}
            </div>

            {/* KPP + OGRN (COMPANY only) */}
            {form.type === "COMPANY" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="af-kpp">{t("sheet.field_kpp")}</Label>
                  <Input
                    id="af-kpp"
                    value={form.kpp}
                    onChange={(e) => set("kpp", e.target.value.replace(/\D/g, ""))}
                    placeholder={t("sheet.field_kpp_placeholder")}
                    maxLength={9}
                    inputMode="numeric"
                    className={cn(errors.kpp && "border-destructive")}
                  />
                  {errors.kpp && (
                    <p className="text-xs text-destructive">{errors.kpp}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="af-ogrn">{t("sheet.field_ogrn")}</Label>
                  <Input
                    id="af-ogrn"
                    value={form.ogrn}
                    onChange={(e) => set("ogrn", e.target.value.replace(/\D/g, ""))}
                    placeholder={t("sheet.field_ogrn_placeholder")}
                    maxLength={13}
                    inputMode="numeric"
                    className={cn(errors.ogrn && "border-destructive")}
                  />
                  {errors.ogrn && (
                    <p className="text-xs text-destructive">{errors.ogrn}</p>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="space-y-1.5">
              <Label htmlFor="af-contact-name">{t("sheet.field_contact_name")}</Label>
              <Input
                id="af-contact-name"
                value={form.contact_person_name}
                onChange={(e) => set("contact_person_name", e.target.value)}
                placeholder="ФИО контактного лица"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="af-phone">{t("sheet.field_contact_phone")}</Label>
                <Input
                  id="af-phone"
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone", e.target.value)}
                  placeholder="+7 ..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="af-email">{t("sheet.field_contact_email")}</Label>
                <Input
                  id="af-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Contract URL */}
            <div className="space-y-1.5">
              <Label htmlFor="af-contract">{t("sheet.field_contract_url")}</Label>
              <Input
                id="af-contract"
                value={form.contract_url}
                onChange={(e) => set("contract_url", e.target.value)}
                placeholder={t("sheet.field_contract_url_placeholder")}
              />
            </div>

            {/* Commission */}
            <div className="space-y-1.5">
              <Label htmlFor="af-commission">
                {t("sheet.field_commission")} <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="af-commission"
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={form.commission_pct}
                  onChange={(e) => set("commission_pct", e.target.value)}
                  className={cn("w-28", errors.commission_pct && "border-destructive")}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              {errors.commission_pct && (
                <p className="text-xs text-destructive">{errors.commission_pct}</p>
              )}
            </div>

            {/* Status (edit only) */}
            {mode === "edit" && (
              <div className="space-y-1.5">
                <Label htmlFor="af-status">{t("sheet.field_status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as AgentStatus)}
                >
                  <SelectTrigger id="af-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
                    <SelectItem value="BLOCKED">{t("status.BLOCKED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border px-6 py-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? t("sheet.submit_create") : t("sheet.submit_edit")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
