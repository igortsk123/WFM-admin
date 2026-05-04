"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Permission } from "@/lib/types"

const ALL_PERMISSIONS: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
]

interface ManagePermissionsDialogContentProps {
  currentPermissions: Permission[]
  onSave: (permissions: Permission[]) => Promise<void>
  onOpenChange: (open: boolean) => void
}

export function ManagePermissionsDialogContent({
  currentPermissions,
  onSave,
  onOpenChange,
}: ManagePermissionsDialogContentProps) {
  const t = useTranslations("screen.employeeDetail")
  const tCommon = useTranslations("common")
  const tPerm = useTranslations("permission")
  const [selected, setSelected] = useState<Permission[]>(currentPermissions)
  const [loading, setLoading] = useState(false)

  function toggle(permission: Permission) {
    setSelected((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    )
  }

  async function handleSave() {
    setLoading(true)
    try {
      await onSave(selected)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const PERM_KEY: Record<Permission, string> = {
    CASHIER: "cashier",
    SALES_FLOOR: "sales_floor",
    SELF_CHECKOUT: "self_checkout",
    WAREHOUSE: "warehouse",
    PRODUCTION_LINE: "production_line",
  }

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{t("dialogs.manage_permissions_title")}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        {ALL_PERMISSIONS.map((perm) => (
          <div key={perm} className="flex items-center gap-3">
            <Checkbox
              id={`perm-${perm}`}
              checked={selected.includes(perm)}
              onCheckedChange={() => toggle(perm)}
            />
            <Label htmlFor={`perm-${perm}`} className="cursor-pointer text-sm font-medium">
              {tPerm(PERM_KEY[perm])}
            </Label>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {t("dialogs.manage_permissions_save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
