"use client"

import { useTranslations } from "next-intl"
import type { FunctionalRole } from "@/lib/types"
import type { UserDetail } from "@/lib/api/users"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleBadge } from "@/components/shared"

import type { FormatDate, FormatTime } from "./_shared"

interface EmployeeProfileTabProps {
  user: UserDetail
  locale: string
  formatDate: FormatDate
  formatTime: FormatTime
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

export function EmployeeProfileTab({ user, locale, formatDate, formatTime, t }: EmployeeProfileTabProps) {
  const activeAssignment = user.assignments.find((a) => a.active)
  const tEmpType = useTranslations("employee_type")

  return (
    <div className="flex flex-col gap-6">
      {/* Personal card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("profile.personal_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileRow label={t("profile.personal_name")} value={[user.last_name, user.first_name, user.middle_name].filter(Boolean).join(" ")} />
            <ProfileRow label={t("profile.personal_phone")} value={<a href={`tel:${user.phone}`} className="text-foreground hover:underline">{user.phone}</a>} />
            {user.email && <ProfileRow label={t("profile.personal_email")} value={<a href={`mailto:${user.email}`} className="text-foreground hover:underline">{user.email}</a>} />}
            <ProfileRow label={t("profile.personal_type")} value={<Badge variant="secondary">{tEmpType(user.type === "STAFF" ? "STAFF" : "FREELANCE")}</Badge>} />
            {user.hired_at && <ProfileRow label={t("profile.personal_hired")} value={formatDate(user.hired_at, locale)} />}
          </dl>
        </CardContent>
      </Card>

      {/* Assignments card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("profile.assignments_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {user.assignments.map((a) => (
              <div
                key={a.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${a.active ? "border-l-2 border-l-primary" : "opacity-60"}`}
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{a.position_name}</span>
                    {a.active && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {t("profile.assignments_current")}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{a.store_name}</span>
                  <span className="text-xs text-muted-foreground">{a.rank.name}</span>
                  {a.external_id && (
                    <span className="text-xs text-muted-foreground font-mono">{a.external_id}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Functional scope card */}
      {user.functional_scope && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("profile.scope_card")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <ProfileRow
                label={t("profile.scope_role")}
                value={<RoleBadge role={user.functional_scope.functional_role as FunctionalRole} />}
              />
              {user.functional_scope.scope_type === "ORGANIZATION" ? (
                <ProfileRow label={t("profile.scope_store_list")} value={t("profile.scope_network")} />
              ) : (
                <ProfileRow
                  label={t("profile.scope_store_list")}
                  value={
                    <span className="text-sm text-foreground">
                      {user.functional_scope.scope_ids.join(", ") || "—"}
                    </span>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("profile.system_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileRow label={t("profile.system_id")} value={<span className="font-mono text-sm">{user.id}</span>} />
            {activeAssignment?.external_id && (
              <ProfileRow label={t("profile.system_external_id")} value={<span className="font-mono text-sm">{activeAssignment.external_id}</span>} />
            )}
            {user.hired_at && (
              <ProfileRow label={t("profile.system_created")} value={formatDate(user.hired_at, locale)} />
            )}
            {user.last_active_at && (
              <ProfileRow label={t("profile.system_last_active")} value={formatTime(user.last_active_at, locale)} />
            )}
            {user.preferred_timezone && (
              <ProfileRow label={t("profile.system_timezone")} value={user.preferred_timezone} />
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
