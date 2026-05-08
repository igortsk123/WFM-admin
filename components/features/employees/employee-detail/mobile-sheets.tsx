"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import type { Permission } from "@/lib/types"
import type { UserDetail } from "@/lib/api/users"

import { Button } from "@/components/ui/button"

import type { EditProfileData } from "../edit-profile-dialog-content"
import { ALL_PERMISSIONS, PERM_KEY_MAP } from "./_shared"

// ─────────────────────────────────────────────────────────────────────────────
// EDIT PROFILE — mobile sheet content
// ─────────────────────────────────────────────────────────────────────────────

interface EditProfileMobileContentProps {
  user: UserDetail
  onSave: (data: EditProfileData) => Promise<void>
  onClose: () => void
}

export function EditProfileMobileContent({ user, onSave, onClose }: EditProfileMobileContentProps) {
  const tCommon = useTranslations("common")
  const t = useTranslations("screen.employeeDetail")

  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)
  const [phone, setPhone] = useState(user.phone)
  const [email, setEmail] = useState(user.email ?? "")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSave({ first_name: firstName, last_name: lastName, phone, email })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">{t("dialogs.edit_profile_last_name")}</label>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">{t("dialogs.edit_profile_first_name")}</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">{t("dialogs.edit_profile_phone")}</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">{t("dialogs.edit_profile_email")}</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
      </div>
      <div className="sticky bottom-0 flex gap-2 pt-2 pb-2 bg-background">
        <Button type="button" variant="outline" className="flex-1 h-12" onClick={onClose}>{tCommon("cancel")}</Button>
        <Button type="submit" disabled={submitting} className="flex-1 h-12">{tCommon("save")}</Button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS — mobile sheet content
// ─────────────────────────────────────────────────────────────────────────────

interface PermissionsMobileContentProps {
  currentPermissions: Permission[]
  onSave: (permissions: Permission[]) => Promise<void>
  onClose: () => void
}

export function PermissionsMobileContent({ currentPermissions, onSave, onClose }: PermissionsMobileContentProps) {
  const [selected, setSelected] = useState<Permission[]>(currentPermissions)
  const [loading, setLoading] = useState(false)
  const tPerm = useTranslations("permission")
  const tCommon = useTranslations("common")
  const t = useTranslations("screen.employeeDetail")

  function toggle(p: Permission) {
    setSelected((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {ALL_PERMISSIONS.map((perm) => (
        <label key={perm} className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(perm)}
            onChange={() => toggle(perm)}
            className="size-5 rounded"
          />
          <span className="text-sm font-medium">{tPerm(PERM_KEY_MAP[perm])}</span>
        </label>
      ))}
      <div className="sticky bottom-0 flex gap-2 pt-2 pb-2 bg-background">
        <Button variant="outline" className="flex-1 h-12" onClick={onClose}>{tCommon("cancel")}</Button>
        <Button
          className="flex-1 h-12"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            await onSave(selected)
            setLoading(false)
            onClose()
          }}
        >
          {t("dialogs.manage_permissions_save")}
        </Button>
      </div>
    </div>
  )
}
