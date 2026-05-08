"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import type { FunctionalRole, Permission } from "@/lib/types"
import {
  bulkAssignPermission,
  bulkRevokePermission,
  bulkUpdateRole,
  bulkUpdateStore,
} from "@/lib/api/users"
import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores"

import { BulkSelectDialog } from "@/components/shared/bulk-select-dialog"
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox"

const ALL_PERMISSIONS: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
]

const ALL_ROLES: FunctionalRole[] = [
  "WORKER",
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
]

const PERMISSION_KEY: Record<Permission, string> = {
  CASHIER: "cashier",
  SALES_FLOOR: "sales_floor",
  SELF_CHECKOUT: "self_checkout",
  WAREHOUSE: "warehouse",
  PRODUCTION_LINE: "production_line",
}

const ROLE_KEY: Record<FunctionalRole, string> = {
  WORKER: "worker",
  STORE_DIRECTOR: "store_director",
  SUPERVISOR: "supervisor",
  REGIONAL: "regional",
  NETWORK_OPS: "network_ops",
  HR_MANAGER: "hr_manager",
  OPERATOR: "operator",
  AGENT: "agent",
  PLATFORM_ADMIN: "platform_admin",
}

interface BulkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: number[]
  onSuccess: () => void
}

// ─────────────────────────────────────────────────────────────────
// PERMISSION ASSIGN DIALOG
// ─────────────────────────────────────────────────────────────────

export function PermissionAssignDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkDialogProps) {
  const t = useTranslations("screen.employees")
  const tPerm = useTranslations("permission")
  const [selectedPerm, setSelectedPerm] = React.useState<Permission | "">("")
  const [loading, setLoading] = React.useState(false)

  const permOptions = ALL_PERMISSIONS.map((p) => ({
    value: p,
    label: tPerm(PERMISSION_KEY[p]),
  }))

  async function handleConfirm() {
    if (!selectedPerm) return
    setLoading(true)
    try {
      const result = await bulkAssignPermission(selectedIds, selectedPerm)
      if (result.success) {
        toast.success(t("toast.permission_assigned"))
        onSuccess()
        onOpenChange(false)
        setSelectedPerm("")
      } else {
        toast.error(t("toast.error"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <BulkSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("dialogs.permission_title")}
      cancelLabel={t("bulk.cancel")}
      submitLabel={t("bulk.assign_permission")}
      submitDisabled={!selectedPerm}
      loading={loading}
      onConfirm={handleConfirm}
    >
      <SingleSelectCombobox
        options={permOptions}
        value={selectedPerm}
        onValueChange={(v) => setSelectedPerm(v as Permission | "")}
        placeholder={t("dialogs.permission_select")}
        className="w-full"
      />
    </BulkSelectDialog>
  )
}

// ─────────────────────────────────────────────────────────────────
// BULK ROLE DIALOG
// ─────────────────────────────────────────────────────────────────

export function BulkRoleDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkDialogProps) {
  const t = useTranslations("screen.employees")
  const tRole = useTranslations("role.functional")
  const [selectedRole, setSelectedRole] = React.useState<FunctionalRole | "">("")
  const [loading, setLoading] = React.useState(false)

  const roleOptions = ALL_ROLES.map((r) => ({
    value: r,
    label: tRole(ROLE_KEY[r]),
  }))

  async function handleConfirm() {
    if (!selectedRole) return
    setLoading(true)
    try {
      const result = await bulkUpdateRole(selectedIds, selectedRole)
      if (result.success) {
        toast.success(
          t("bulk.toast_role_done", {
            role: roleOptions.find((o) => o.value === selectedRole)?.label ?? selectedRole,
            count: selectedIds.length,
          }),
        )
        onSuccess()
        onOpenChange(false)
        setSelectedRole("")
      } else {
        toast.error(t("bulk.toast_error"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <BulkSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("bulk.dialog.assign_role_title", { count: selectedIds.length })}
      cancelLabel={t("bulk.cancel")}
      submitLabel={t("bulk.dialog.submit")}
      submitDisabled={!selectedRole}
      loading={loading}
      onConfirm={handleConfirm}
    >
      <SingleSelectCombobox
        options={roleOptions}
        value={selectedRole}
        onValueChange={(v) => setSelectedRole(v as FunctionalRole | "")}
        placeholder={t("bulk.dialog.assign_role_select")}
        className="w-full"
      />
    </BulkSelectDialog>
  )
}

// ─────────────────────────────────────────────────────────────────
// BULK STORE DIALOG
// ─────────────────────────────────────────────────────────────────

export function BulkStoreDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkDialogProps) {
  const t = useTranslations("screen.employees")
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)

  const storeOptions = DEMO_TOP_STORES.map((s) => ({
    value: String(s.id),
    label: s.name,
  }))

  async function handleConfirm() {
    if (!selectedStoreId) return
    setLoading(true)
    try {
      const result = await bulkUpdateStore(selectedIds, Number(selectedStoreId))
      if (result.success) {
        toast.success(t("bulk.toast_store_done", { count: selectedIds.length }))
        onSuccess()
        onOpenChange(false)
        setSelectedStoreId("")
      } else {
        toast.error(t("bulk.toast_error"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <BulkSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("bulk.dialog.change_store_title")}
      description={t("bulk.dialog.change_store_desc")}
      cancelLabel={t("bulk.cancel")}
      submitLabel={t("bulk.dialog.submit")}
      submitDisabled={!selectedStoreId}
      loading={loading}
      onConfirm={handleConfirm}
    >
      <SingleSelectCombobox
        options={storeOptions}
        value={selectedStoreId}
        onValueChange={setSelectedStoreId}
        placeholder={t("bulk.dialog.change_store_select")}
        className="w-full"
      />
    </BulkSelectDialog>
  )
}

// ─────────────────────────────────────────────────────────────────
// BULK ZONE DIALOG (assign or revoke permission)
// ─────────────────────────────────────────────────────────────────

interface BulkZoneDialogProps extends BulkDialogProps {
  mode: "assign" | "revoke"
}

export function BulkZoneDialog({
  open,
  onOpenChange,
  mode,
  selectedIds,
  onSuccess,
}: BulkZoneDialogProps) {
  const t = useTranslations("screen.employees")
  const tPerm = useTranslations("permission")
  const [selectedPerm, setSelectedPerm] = React.useState<Permission | "">("")
  const [loading, setLoading] = React.useState(false)

  const permOptions = ALL_PERMISSIONS.map((p) => ({
    value: p,
    label: tPerm(PERMISSION_KEY[p]),
  }))

  async function handleConfirm() {
    if (!selectedPerm) return
    setLoading(true)
    try {
      const result =
        mode === "assign"
          ? await bulkAssignPermission(selectedIds, selectedPerm)
          : await bulkRevokePermission(selectedIds, selectedPerm)
      if (result.success) {
        toast.success(t("bulk.toast_done", { count: selectedIds.length }))
        onSuccess()
        onOpenChange(false)
        setSelectedPerm("")
      } else {
        toast.error(t("bulk.toast_error"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <BulkSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "assign" ? t("bulk.assign_zone") : t("bulk.revoke_zone")}
      cancelLabel={t("bulk.cancel")}
      submitLabel={t("bulk.dialog.submit")}
      submitDisabled={!selectedPerm}
      submitVariant={mode === "revoke" ? "destructive" : "default"}
      loading={loading}
      onConfirm={handleConfirm}
    >
      <SingleSelectCombobox
        options={permOptions}
        value={selectedPerm}
        onValueChange={(v) => setSelectedPerm(v as Permission | "")}
        placeholder={t("dialogs.permission_select")}
        className="w-full"
      />
    </BulkSelectDialog>
  )
}
