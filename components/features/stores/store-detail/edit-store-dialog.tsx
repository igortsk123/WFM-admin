"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { updateStore, type StoreDetail as StoreDetailData } from "@/lib/api"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: StoreDetailData
  onSaved: () => void
}

export function EditStoreDialog({ open, onOpenChange, data, onSaved }: EditStoreDialogProps) {
  const t = useTranslations("screen.storeDetail")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: data.name,
    external_code: data.external_code,
    address: data.address,
    city: data.city,
    store_type: data.store_type,
    lat: String(data.geo?.lat ?? ""),
    lng: String(data.geo?.lng ?? ""),
  })

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateStore(data.id, {
        name: form.name,
        external_code: form.external_code,
        address: form.address,
        city: form.city,
        store_type: form.store_type,
        geo: form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : data.geo,
      })
      toast.success(t("toast.store_updated"))
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error(t("toast.error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogs.edit_title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">{t("dialogs.edit_name")}</Label>
            <Input id="edit-name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-code">{t("dialogs.edit_external_code")}</Label>
            <Input id="edit-code" value={form.external_code} onChange={(e) => handleChange("external_code", e.target.value)} className="font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-address">{t("dialogs.edit_address")}</Label>
            <Input id="edit-address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-city">{t("dialogs.edit_city")}</Label>
            <Input id="edit-city" value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-type">{t("dialogs.edit_store_type")}</Label>
            <Input id="edit-type" value={form.store_type} onChange={(e) => handleChange("store_type", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-lat">{t("dialogs.edit_geo_lat")}</Label>
              <Input id="edit-lat" value={form.lat} onChange={(e) => handleChange("lat", e.target.value)} placeholder="56.484" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-lng">{t("dialogs.edit_geo_lng")}</Label>
              <Input id="edit-lng" value={form.lng} onChange={(e) => handleChange("lng", e.target.value)} placeholder="84.957" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
