"use client"

import { useTranslations } from "next-intl"
import {
  Phone,
  Mail,
  Briefcase,
  CheckCircle2,
  Clock,
  Timer,
  Info,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import type { Permission } from "@/lib/types"
import type { UserDetail } from "@/lib/api/users"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DetailPageHero,
  KpiCard,
  PermissionPill,
  FreelancerStatusBadge,
} from "@/components/shared"

interface HeroCardProps {
  user: UserDetail
  fullName: string
  initials: string
  localPermissions: Permission[]
  onAssignPermissions: () => void
  actions: ReactNode
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tPerm: ReturnType<typeof useTranslations<"permission">>
}

export function HeroCard({
  user,
  fullName,
  initials,
  localPermissions,
  onAssignPermissions,
  actions,
  t,
  tPerm,
}: HeroCardProps) {
  const activeAssignment = user.assignments.find((a) => a.active)
  const stats = user.stats

  const leading = (
    <Avatar className="size-16 md:size-20">
      <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  )

  const status = (
    <>
      {!user.archived && (
        <span className="flex items-center gap-1" title={t("active_dot_label")}>
          <span
            className="size-2 rounded-full bg-success"
            aria-label={t("active_dot_label")}
          />
        </span>
      )}
      {user.archived && <Badge variant="secondary">{t("archived_label")}</Badge>}
      {user.type === "FREELANCE" && user.freelancer_status && (
        <FreelancerStatusBadge status={user.freelancer_status} />
      )}
    </>
  )

  const subtitle = activeAssignment ? (
    <>
      {activeAssignment.position_name}
      {" · "}
      <Link
        href={ADMIN_ROUTES.storeDetail(String(activeAssignment.store_id))}
        className="hover:text-foreground hover:underline underline-offset-2 transition-colors"
      >
        {activeAssignment.store_name}
      </Link>
    </>
  ) : null

  const meta = (
    <>
      {/* Contact row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <a
          href={`tel:${user.phone}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
        >
          <Phone className="size-4 shrink-0" aria-hidden="true" />
          {user.phone}
        </a>
        {user.email && (
          <a
            href={`mailto:${user.email}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
          >
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            {user.email}
          </a>
        )}
      </div>

      {/* Permission pills — hidden for FREELANCE (no zone permissions) */}
      {user.type === "STAFF" &&
        (localPermissions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" role="list" aria-label={tPerm("titlePlural")}>
            {localPermissions.map((p) => (
              <span key={p} role="listitem">
                <PermissionPill permission={p} />
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t("permissions_empty")}{" "}
            <button
              onClick={onAssignPermissions}
              className="text-primary hover:underline underline-offset-2"
            >
              {t("permissions_assign")}
            </button>
          </p>
        ))}

      {/* FREELANCE-only hero extras */}
      {user.type === "FREELANCE" && (
        <div className="flex flex-col gap-3">
          {/* External sync badge */}
          {user.source === "EXTERNAL_SYNC" && (
            <div className="flex items-center gap-1.5 rounded-md bg-info/10 px-2.5 py-1.5 w-fit">
              <Info className="size-3.5 text-info shrink-0" aria-hidden="true" />
              <span className="text-xs text-info">{t("freelance_hero.external_sync_badge")}</span>
            </div>
          )}

          {/* Agent card — shown only in NOMINAL_ACCOUNT mode */}
          {user.agent_id && user.agent_name && user.payment_mode !== "CLIENT_DIRECT" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("freelance_hero.agent_label")}:</span>
              <Link
                href={ADMIN_ROUTES.freelanceAgentDetail(user.agent_id)}
                className="text-foreground font-medium hover:underline underline-offset-2 transition-colors"
              >
                {user.agent_name}
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  )

  const statsSlot = stats ? (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <KpiCard
        label={t("stats.tasks_month")}
        value={stats.tasks_total}
        diff={stats.tasks_diff_pct}
        icon={Briefcase}
      />
      <div className="flex flex-col gap-1 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-muted">
            <CheckCircle2 className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium text-muted-foreground truncate">
            {t("stats.accepted_rejected")}
          </span>
        </div>
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          {stats.tasks_accepted}
          {" / "}
          {stats.tasks_rejected}
        </span>
      </div>
      <KpiCard label={t("stats.paused_now")} value={stats.paused_now} icon={Clock} />
      <div className="flex flex-col gap-1 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-muted">
            <Timer className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium text-muted-foreground truncate">
            {t("stats.avg_completion")}
          </span>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {stats.avg_completion_min} {t("stats.minutes_unit")}
          </span>
          {stats.avg_completion_diff_min !== 0 && (
            <span
              className={`flex items-center gap-0.5 text-sm font-medium mb-0.5 ${
                stats.avg_completion_diff_min < 0 ? "text-success" : "text-destructive"
              }`}
            >
              {stats.avg_completion_diff_min > 0 ? "+" : ""}
              {stats.avg_completion_diff_min} {t("stats.minutes_unit")} {t("stats.diff_vs_plan")}
            </span>
          )}
        </div>
      </div>
    </div>
  ) : null

  return (
    <DetailPageHero
      leading={leading}
      title={fullName}
      status={status}
      subtitle={subtitle}
      meta={meta}
      actions={actions}
      statsSlot={statsSlot}
    />
  )
}
