"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import type { StoreWithStats } from "@/lib/api/stores"
import { createStore, updateStore } from "@/lib/api/stores"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

import { CITY_OPTIONS, OBJECT_TYPE_OPTIONS } from "./_shared"

interface StoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  store?: StoreWithStats | null
  onSuccess: () => void
}

export function StoreDialog({ open, onOpenChange, store, onSuccess }: StoreDialogProps) {
  const t = useTranslations("screen.stores")
  const [loading, setLoading] = React.useState(false)
  const [name, setName] = React.useState(store?.name ?? "")
  const [code, setCode] = React.useState(store?.external_code ?? "")
  const [address, setAddress] = React.useState(store?.address ?? "")
  const [city, setCity] = React.useState(store?.city ?? "")
  const [storeType, setStoreType] = React.useState(store?.store_type ?? "SUPERMARKET")
  const [objectType, setObjectType] = React.useState(store?.object_type ?? "STORE")

  React.useEffect(() => {
    if (open) {
      setName(store?.name ?? "")
      setCode(store?.external_code ?? "")
      setAddress(store?.address ?? "")
      setCity(store?.city ?? "")
      setStoreType(store?.store_type ?? "SUPERMARKET")
      setObjectType(store?.object_type ?? "STORE")
    }
  }, [open, store])

  async function handleSave() {
    if (!name || !city) return
    setLoading(true)
    try {
      const payload = {
        name,
        external_code: code,
        address,
        city,
        store_type: storeType,
        object_type: objectType as StoreWithStats["object_type"],
      }
      const result = store
        ? await updateStore(store.id, payload)
        : await createStore(payload)
      if (result.success) {
        toast.success(t("toast.saved"))
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(t("toast.error"))
      }
    } finally {
      setLoading(false)
    }
  }

  const isEdit = !!store

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("dialogs.edit_title") : t("dialogs.add_title")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="store-name">{t("dialogs.fields.name")}</Label>
            <Input
              id="store-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="СПАР Томск, пр. Ленина 80"
            />
          </div>

          {/* External code */}
          <div className="grid gap-1.5">
            <Label htmlFor="store-code">{t("dialogs.fields.external_code")}</Label>
            <Input
              id="store-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SPAR-TOM-001"
              className="font-mono uppercase"
            />
          </div>

          {/* Address */}
          <div className="grid gap-1.5">
            <Label htmlFor="store-address">{t("dialogs.fields.address")}</Label>
            <Textarea
              id="store-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="пр. Ленина, 80"
            />
          </div>

          {/* City */}
          <div className="grid gap-1.5">
            <Label>{t("dialogs.fields.city")}</Label>
            <SingleSelectCombobox
              options={CITY_OPTIONS}
              value={city}
              onValueChange={setCity}
              placeholder="Выберите город"
              className="w-full"
            />
          </div>

          {/* Store type */}
          <div className="grid gap-2">
            <Label>{t("dialogs.fields.store_type")}</Label>
            <RadioGroup
              value={storeType}
              onValueChange={setStoreType}
              className="grid grid-cols-2 gap-2"
            >
              {["Супермаркет", "Гипермаркет", "Магазин у дома", "Малый формат"].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <RadioGroupItem value={type} id={`type-${type}`} />
                  <Label
                    htmlFor={`type-${type}`}
                    className="font-normal text-sm cursor-pointer"
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Object type */}
          <div className="grid gap-1.5">
            <Label>{t("dialogs.fields.object_type")}</Label>
            <Select value={objectType} onValueChange={(v) => setObjectType(v as typeof objectType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!name || !city || loading}>
            {loading ? "..." : t("dialogs.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
