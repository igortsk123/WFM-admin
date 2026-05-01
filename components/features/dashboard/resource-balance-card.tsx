"use client"

import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Users, Gift, UserCheck, TrendingDown, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { ResourceBalanceData } from "@/lib/api/dashboard"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount)
}

function staffCoverageColor(pct: number): string {
  if (pct >= 80) return "text-success"
  if (pct >= 60) return "text-warning"
  return "text-destructive"
}

function staffProgressColor(pct: number): string {
  if (pct >= 80) return "bg-success"
  if (pct >= 60) return "bg-warning"
  return "bg-destructive"
}

// ═══════════════════════════════════════════════════════════════════
// MINI STAT
// ═══════════════════════════════════════════════════════════════════

interface MiniStatProps {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  subtext: string
  href?: string
  valueClassName?: string
  /** Staff stat occupies 1.5× width on ≥md */
  wide?: boolean
}

function MiniStat({
  icon: Icon,
  label,
  value,
  subtext,
  href,
  valueClassName,
  wide,
}: MiniStatProps) {
  const inner = (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 p-4 flex flex-col gap-1 transition-colors",
        href && "hover:bg-accent cursor-pointer",
        wide && "md:col-span-1" // grid handles wide via parent col span
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn("text-xl font-semibold leading-tight", valueClassName)}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">{subtext}</p>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    )
  }
  return inner
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface ResourceBalanceCardProps {
  data: ResourceBalanceData
  freelanceModuleEnabled: boolean
  externalHrEnabled: boolean
}

export function ResourceBalanceCard({
  data,
  freelanceModuleEnabled,
  externalHrEnabled,
}: ResourceBalanceCardProps) {
  const t = useTranslations("screen.dashboard.resource_balance")
  const locale = useLocale()

  const {
    staff_completed_hours,
    planned_hours,
    staff_coverage_pct,
    bonus_hours_completed,
    freelance_hours_needed,
    active_freelance_assignments_today,
    saved_amount_from_bonus_replacement,
    pending_applications_count,
    overspend_count,
    external_unassigned_count,
  } = data

  // Empty state: all zero
  const isEmpty =
    staff_completed_hours === 0 &&
    bonus_hours_completed === 0 &&
    freelance_hours_needed === 0 &&
    saved_amount_from_bonus_replacement === 0

  const title = freelanceModuleEnabled ? t("title") : t("title_no_freelance")

  // Secondary row items — only with freelance enabled
  const secondaryLinks = freelanceModuleEnabled
    ? [
        pending_applications_count > 0
          ? {
              key: "pending",
              label: t("pending_applications", { n: pending_applications_count }),
              href: `${ADMIN_ROUTES.freelanceApplications}?status=PENDING`,
            }
          : null,
        overspend_count > 0
          ? {
              key: "overspend",
              label: t("overspend", { n: overspend_count }),
              href: `${ADMIN_ROUTES.freelanceDashboard}?filter=overspend`,
            }
          : null,
        externalHrEnabled && external_unassigned_count > 0
          ? {
              key: "external",
              label: t("external_unassigned", { n: external_unassigned_count }),
              href: `${ADMIN_ROUTES.freelanceApplications}?source=EXTERNAL&unassigned=true`,
            }
          : null,
      ].filter(Boolean)
    : []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Link
            href={ADMIN_ROUTES.reportsPlanFact}
            className="text-sm text-primary hover:underline shrink-0"
          >
            {t("details_link")}
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEmpty ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="size-8 text-success" />
            <p className="text-sm font-medium text-foreground">
              {t("empty_title")}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {t("empty_description")}
            </p>
          </div>
        ) : (
          <>
            {/* ── Stats grid ──────────────────────────────────────── */}
            {/* Mobile: 2×2, Desktop: 4 cols with staff being wider */}
            <div
              className={cn(
                "grid gap-3",
                freelanceModuleEnabled
                  ? "grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]"
                  : "grid-cols-2 md:grid-cols-2"
              )}
            >
              {/* 1. Staff — widest on desktop */}
              <div className="col-span-2 md:col-span-1">
                <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-1 h-full">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-4 shrink-0" />
                    <span className="text-xs font-medium">
                      {t("stat_staff_label")}
                    </span>
                  </div>
                  <Link
                    href={`${ADMIN_ROUTES.tasks}?date=today`}
                    className="group"
                  >
                    <p
                      className={cn(
                        "text-xl font-semibold leading-tight group-hover:underline",
                        staffCoverageColor(staff_coverage_pct)
                      )}
                    >
                      {staff_completed_hours} / {planned_hours} ч
                    </p>
                  </Link>
                  {/* Inline progress bar with dynamic color */}
                  <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
                    <div
                      className={cn(
                        "h-full transition-all rounded-full",
                        staffProgressColor(staff_coverage_pct)
                      )}
                      style={{ width: `${Math.min(staff_coverage_pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("stat_staff_subtext")}
                  </p>
                </div>
              </div>

              {/* 2. Bonus */}
              <MiniStat
                icon={Gift}
                label={t("stat_bonus_label")}
                value={`${bonus_hours_completed} ч`}
                subtext={t("stat_bonus_subtext")}
                href={`${ADMIN_ROUTES.bonusTasks}?date=today`}
              />

              {/* 3. Freelance needed — only if module enabled */}
              {freelanceModuleEnabled && (
                <MiniStat
                  icon={UserCheck}
                  label={t("stat_freelance_label")}
                  value={
                    active_freelance_assignments_today > 0
                      ? `${active_freelance_assignments_today} исп.`
                      : `${freelance_hours_needed} ч`
                  }
                  subtext={t("stat_freelance_subtext")}
                  href={`${ADMIN_ROUTES.freelanceDashboard}?date=today`}
                />
              )}

              {/* 4. Savings — only if module enabled */}
              {freelanceModuleEnabled && (
                <MiniStat
                  icon={TrendingDown}
                  label={t("stat_savings_label")}
                  value={formatCurrency(saved_amount_from_bonus_replacement, locale)}
                  subtext={t("stat_savings_subtext")}
                  href={`${ADMIN_ROUTES.bonusTasks}?source=freelance_replacement`}
                  valueClassName="text-success"
                />
              )}
            </div>

            {/* ── Secondary row ────────────────────────────────────── */}
            {secondaryLinks.length > 0 && (
              <div className="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-0">
                {secondaryLinks.map((item, idx) => (
                  <span key={item!.key} className="flex items-center">
                    {idx > 0 && (
                      <span className="hidden md:inline mx-2 text-muted-foreground text-xs">
                        ·
                      </span>
                    )}
                    <Link
                      href={item!.href}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {item!.label}
                    </Link>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
