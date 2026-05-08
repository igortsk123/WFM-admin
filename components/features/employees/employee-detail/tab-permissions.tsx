"use client"

import { useTranslations } from "next-intl"
import { Shield, CheckCircle2, XCircle } from "lucide-react"

import type { Permission } from "@/lib/types"
import type { UserDetail } from "@/lib/api/users"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

import { ALL_PERMISSIONS, PERM_DESCS, PERM_KEY_MAP } from "./_shared"

interface EmployeePermissionsTabProps {
  user: UserDetail
  localPermissions: Permission[]
  onToggle: (perm: Permission, enable: boolean) => Promise<void>
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tPerm: ReturnType<typeof useTranslations<"permission">>
}

export function EmployeePermissionsTab({ user, localPermissions, onToggle, t, tPerm }: EmployeePermissionsTabProps) {
  const grantedMap = new Map(
    user.permissions
      .filter((p) => !p.revoked_at)
      .map((p) => [p.permission, p])
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Permission cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_PERMISSIONS.map((perm) => {
          const granted = grantedMap.get(perm)
          const isActive = localPermissions.includes(perm)
          return (
            <Card key={perm}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className="text-sm font-medium">{tPerm(PERM_KEY_MAP[perm])}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {PERM_DESCS[perm]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 min-h-[44px]">
                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => onToggle(perm, v)}
                      aria-label={tPerm(PERM_KEY_MAP[perm])}
                    />
                  </div>
                </div>
                {granted && (
                  <div className="mt-3 pt-3 border-t flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {t("permissions.granted_at")}: {granted.granted_at}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("permissions.granted_by")}: {granted.granted_by_name}
                    </span>
                  </div>
                )}
                {!granted && isActive && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    {t("permissions.not_granted")}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Permission history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("permissions.history_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          {user.permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {user.permissions.map((p) => (
                <li key={p.id} className="flex items-start gap-3">
                  {p.revoked_at ? (
                    <XCircle className="size-4 text-destructive mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {p.revoked_at
                        ? t("permissions.history_revoked", { permission: tPerm(PERM_KEY_MAP[p.permission]) })
                        : t("permissions.history_granted", { permission: tPerm(PERM_KEY_MAP[p.permission]) })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.revoked_at ? p.revoked_at : p.granted_at} · {p.revoked_at ? p.revoked_by_name : p.granted_by_name}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
