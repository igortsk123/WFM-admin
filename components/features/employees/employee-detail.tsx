"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import {
  SearchX,
  Lock,
  AlertCircle,
  RotateCcw,
} from "lucide-react"

import type { Permission } from "@/lib/types"
import type { UserDetail } from "@/lib/api/users"
import {
  getUserById,
  updateUser,
  archiveUser,
  updateUserPermissions,
} from "@/lib/api/users"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { PageHeader, EmptyState } from "@/components/shared"

import type { EditProfileData } from "./edit-profile-dialog-content"

import {
  formatFullName,
  formatShortName,
  getInitials,
  formatDate,
  formatTime,
  type LoadState,
} from "./employee-detail/_shared"
import { HeroCard } from "./employee-detail/hero-card"
import { HeroActions } from "./employee-detail/hero-actions"
import { EmployeeTabsHeader } from "./employee-detail/tabs-header"
import { EmployeeProfileTab } from "./employee-detail/tab-profile"
import { FreelanceOfferCard } from "./employee-detail/freelance-offer-card"

// ── Non-default tabs: lazy-loaded on click ────────────────────────────────────
const TabSkeleton = () => (
  <div className="h-64 animate-pulse rounded-md bg-muted/50" />
)

const EmployeeTasksTab = dynamic(
  () => import("./employee-detail/tab-tasks").then((m) => m.EmployeeTasksTab),
  { loading: () => <TabSkeleton /> },
)
const EmployeeShiftsTab = dynamic(
  () => import("./employee-detail/tab-shifts").then((m) => m.EmployeeShiftsTab),
  { loading: () => <TabSkeleton /> },
)
const EmployeePermissionsTab = dynamic(
  () => import("./employee-detail/tab-permissions").then((m) => m.EmployeePermissionsTab),
  { loading: () => <TabSkeleton /> },
)
const EmployeeHistoryTab = dynamic(
  () => import("./employee-detail/tab-history").then((m) => m.EmployeeHistoryTab),
  { loading: () => <TabSkeleton /> },
)
const EmployeeDocumentsTab = dynamic(
  () => import("./employee-detail/tab-documents").then((m) => m.EmployeeDocumentsTab),
  { loading: () => <TabSkeleton /> },
)
const EmployeeServicesTab = dynamic(
  () => import("./employee-detail/tab-services").then((m) => m.EmployeeServicesTab),
  { loading: () => <TabSkeleton /> },
)
const EmployeePayoutsTab = dynamic(
  () => import("./employee-detail/tab-payouts").then((m) => m.EmployeePayoutsTab),
  { loading: () => <TabSkeleton /> },
)
const EmployeeRatingTab = dynamic(
  () => import("./employee-detail/tab-rating").then((m) => m.EmployeeRatingTab),
  { loading: () => <TabSkeleton /> },
)
const EmployeeWorkTypesTab = dynamic(
  () => import("./employee-detail/tab-work-types").then((m) => m.EmployeeWorkTypesTab),
  { loading: () => <TabSkeleton /> },
)

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface EmployeeDetailProps {
  userId: number
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function EmployeeDetail({ userId }: EmployeeDetailProps) {
  const t = useTranslations("screen.employeeDetail")
  const tCommon = useTranslations("common")
  const tPerm = useTranslations("permission")
  const locale = useLocale()
  const router = useRouter()

  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [user, setUser] = useState<UserDetail | null>(null)
  const [localPermissions, setLocalPermissions] = useState<Permission[]>([])

  // Dialog state
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [managePermsOpen, setManagePermsOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockReason, setBlockReason] = useState("")
  const [blockLoading, setBlockLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const load = useCallback(async () => {
    setLoadState("loading")
    try {
      const res = await getUserById(userId)
      setUser(res.data)
      const activePerms = res.data.permissions
        .filter((p) => !p.revoked_at)
        .map((p) => p.permission)
      setLocalPermissions(activePerms)
      setLoadState("loaded")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.includes("not found")) setLoadState("not_found")
      else if (msg.includes("forbidden")) setLoadState("forbidden")
      else setLoadState("error")
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  // ── Loading skeleton ────────────────────────────────────────────
  if (loadState === "loading") {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  // ── Error states ────────────────────────────────────────────────
  if (loadState === "not_found") {
    return (
      <EmptyState
        icon={SearchX}
        title={t("states.not_found_title")}
        description={t("states.not_found_description")}
        action={{ label: t("breadcrumb_employees"), href: ADMIN_ROUTES.employees }}
      />
    )
  }

  if (loadState === "forbidden") {
    return (
      <EmptyState
        icon={Lock}
        title={t("states.forbidden_title")}
        description={t("states.forbidden_description")}
        action={{ label: tCommon("back"), onClick: () => router.back() }}
      />
    )
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircle className="size-4" />
          <AlertDescription>{tCommon("error")}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={load}>
          <RotateCcw className="size-4 mr-2" />
          {t("states.error_retry")}
        </Button>
      </div>
    )
  }

  if (!user) return null

  // ── Derived data ────────────────────────────────────────────────
  const fullName = formatFullName(user)
  const shortName = formatShortName(user)
  const initials = getInitials(user)

  // ─────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────

  async function handleSaveProfile(data: EditProfileData) {
    try {
      const res = await updateUser(userId, {
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name,
        phone: data.phone,
        email: data.email || null,
      })
      if (res.success) {
        toast.success(t("toast.profile_updated"))
        await load()
      } else {
        toast.error(t("toast.error"))
      }
    } catch {
      toast.error(t("toast.error"))
    }
  }

  async function handleSavePermissions(permissions: Permission[]) {
    try {
      const res = await updateUserPermissions(userId, permissions)
      if (res.success) {
        setLocalPermissions(permissions)
        toast.success(t("toast.permissions_updated"))
      } else {
        toast.error(t("toast.error"))
      }
    } catch {
      toast.error(t("toast.error"))
    }
  }

  async function handleArchive() {
    try {
      const res = await archiveUser(userId)
      if (res.success) {
        toast.success(t("toast.archived"))
        router.push(ADMIN_ROUTES.employees as string)
      } else {
        toast.error(t("toast.error"))
      }
    } catch {
      toast.error(t("toast.error"))
    }
  }

  async function handleTogglePermission(perm: Permission, enable: boolean) {
    const next = enable
      ? [...new Set([...localPermissions, perm])]
      : localPermissions.filter((p) => p !== perm)
    await handleSavePermissions(next)
  }

  async function handleBlock() {
    setBlockLoading(true)
    try {
      await updateUser(userId, { freelancer_status: "BLOCKED" } as never)
      toast.success(t("actions.block_toast"))
      setBlockOpen(false)
      setBlockReason("")
      await load()
    } catch {
      toast.error(t("toast.error"))
    } finally {
      setBlockLoading(false)
    }
  }

  async function handleActivate() {
    try {
      await updateUser(userId, { freelancer_status: "ACTIVE" } as never)
      toast.success(t("actions.activate_toast"))
      await load()
    } catch {
      toast.error(t("toast.error"))
    }
  }

  async function handleSendOfferLink() {
    if (!user) return
    await new Promise((r) => setTimeout(r, 600))
    toast.success(t("freelance_hero.offer_link_sent", { phone: user.phone }))
  }

  // ─────────────────────────────────────────────────────────────────
  // BREADCRUMBS
  // ─────────────────────────────────────────────────────────────────

  const breadcrumbs = [
    { label: t("breadcrumb_home"), href: ADMIN_ROUTES.dashboard },
    { label: t("breadcrumb_employees"), href: ADMIN_ROUTES.employees },
    { label: shortName },
  ]

  const heroActions = (
    <HeroActions
      user={user}
      userId={userId}
      isMobile={isMobile}
      localPermissions={localPermissions}
      managePermsOpen={managePermsOpen}
      setManagePermsOpen={setManagePermsOpen}
      editProfileOpen={editProfileOpen}
      setEditProfileOpen={setEditProfileOpen}
      archiveOpen={archiveOpen}
      setArchiveOpen={setArchiveOpen}
      blockOpen={blockOpen}
      setBlockOpen={setBlockOpen}
      blockReason={blockReason}
      setBlockReason={setBlockReason}
      blockLoading={blockLoading}
      onSaveProfile={handleSaveProfile}
      onSavePermissions={handleSavePermissions}
      onArchive={handleArchive}
      onBlock={handleBlock}
      onActivate={handleActivate}
      t={t}
      tCommon={tCommon}
    />
  )

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Page header breadcrumbs */}
      <PageHeader
        title=""
        breadcrumbs={breadcrumbs}
        className="mb-0 pb-0"
      />

      {/* ── HERO CARD ────────────────────────────────────────────── */}
      <HeroCard
        user={user}
        fullName={fullName}
        initials={initials}
        localPermissions={localPermissions}
        onAssignPermissions={() => setManagePermsOpen(true)}
        actions={heroActions}
        t={t}
        tPerm={tPerm}
      />

      {/* ── FREELANCE: Offer card ─────────────────────────────── */}
      {user.type === "FREELANCE" && (
        <FreelanceOfferCard
          user={user}
          locale={locale}
          formatDate={formatDate}
          t={t}
          tCommon={tCommon}
          onSendLink={handleSendOfferLink}
        />
      )}

      {/* ── TABS ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="profile" className="w-full">
        <EmployeeTabsHeader user={user} t={t} />

        <TabsContent value="profile" className="mt-6">
          <EmployeeProfileTab user={user} locale={locale} formatDate={formatDate} formatTime={formatTime} t={t} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <EmployeeTasksTab t={t} tCommon={tCommon} />
        </TabsContent>

        <TabsContent value="shifts" className="mt-6">
          <EmployeeShiftsTab t={t} />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <EmployeePermissionsTab
            user={user}
            localPermissions={localPermissions}
            onToggle={handleTogglePermission}
            t={t}
            tPerm={tPerm}
          />
        </TabsContent>

        <TabsContent value="work_types" className="mt-6">
          <EmployeeWorkTypesTab user={user} t={t} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <EmployeeHistoryTab user={user} locale={locale} formatTime={formatTime} t={t} />
        </TabsContent>

        {/* Documents — только для FREELANCE (внештатникам нужны паспорт/ИНН/договор) */}
        {user.type === "FREELANCE" && (
          <TabsContent value="documents" className="mt-6">
            <EmployeeDocumentsTab user={user} t={t} locale={locale} formatDate={formatDate} />
          </TabsContent>
        )}

        {user.type === "FREELANCE" && (
          <TabsContent value="services" className="mt-6">
            <EmployeeServicesTab
              freelancerId={userId}
              paymentMode={user.payment_mode ?? "NOMINAL_ACCOUNT"}
              locale={locale}
              formatDate={formatDate}
              t={t}
              tCommon={tCommon}
            />
          </TabsContent>
        )}

        {user.type === "FREELANCE" && user.payment_mode !== "CLIENT_DIRECT" && (
          <TabsContent value="payouts" className="mt-6">
            <EmployeePayoutsTab
              freelancerId={userId}
              locale={locale}
              formatDate={formatDate}
              t={t}
              tCommon={tCommon}
            />
          </TabsContent>
        )}

        {user.type === "FREELANCE" && (
          <TabsContent value="rating" className="mt-6">
            <EmployeeRatingTab user={user} t={t} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
