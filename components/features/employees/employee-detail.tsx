"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import {
  Plus,
  Shield,
  Pencil,
  MoreHorizontal,
  Phone,
  Mail,
  SearchX,
  Lock,
  AlertCircle,
  Briefcase,
  UserCog,
  MoveRight,
  KeyRound,
  Archive,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  FileText,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  Star,
  BanIcon,
  UserCheck,
} from "lucide-react"
import Link from "next/link"

import type { Permission, FunctionalRole, Service, Payout } from "@/lib/types"
import type { UserDetail } from "@/lib/api/users"
import {
  getUserById,
  updateUser,
  archiveUser,
  updateUserPermissions,
} from "@/lib/api/users"
import { getServices } from "@/lib/api/freelance-services"
import { getPayouts } from "@/lib/api/freelance-payouts"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  PageHeader,
  KpiCard,
  PermissionPill,
  RoleBadge,
  EmptyState,
  FreelancerStatusBadge,
} from "@/components/shared"

import { EditProfileDialogContent } from "./edit-profile-dialog-content"
import type { EditProfileData } from "./edit-profile-dialog-content"
import { ManagePermissionsDialogContent } from "./manage-permissions-dialog-content"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface EmployeeDetailProps {
  userId: number
}

type LoadState = "loading" | "loaded" | "not_found" | "forbidden" | "error"



const ALL_PERMISSIONS: Permission[] = [
  "CASHIER",
  "SALES_FLOOR",
  "SELF_CHECKOUT",
  "WAREHOUSE",
  "PRODUCTION_LINE",
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatFullName(user: UserDetail) {
  return [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(" ")
}

function formatShortName(user: UserDetail) {
  const i = user.first_name[0] ? `${user.first_name[0]}.` : ""
  const m = user.middle_name?.[0] ? `${user.middle_name[0]}.` : ""
  return `${user.last_name} ${i}${m}`.trim()
}

function getInitials(user: UserDetail) {
  return `${user.last_name[0] ?? ""}${user.first_name[0] ?? ""}`.toUpperCase()
}

function formatDate(iso: string | undefined | null, locale: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

function formatTime(iso: string | undefined | null, locale: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
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
  const activeAssignment = user.assignments.find((a) => a.active)
  const stats = user.stats

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

  // ─────────────────────────────────────────────────────────────────
  // HERO SECTION
  // ─────────────────────────────────────────────────────────────────

  const HeroActions = (
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
      <Button
        size="sm"
        asChild
        className="min-h-11 w-full flex-1 md:w-auto md:flex-none"
      >
        <Link href={`${ADMIN_ROUTES.taskNew}?assignee_id=${userId}`}>
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t("actions.assign_task")}</span>
          <span className="sm:hidden">{t("actions.assign_task")}</span>
        </Link>
      </Button>

      {/* Manage permissions */}
      {isMobile ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 md:flex-none"
            onClick={() => setManagePermsOpen(true)}
          >
            <Shield className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("actions.permissions")}</span>
          </Button>
          <Sheet open={managePermsOpen} onOpenChange={setManagePermsOpen}>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t("dialogs.manage_permissions_title")}</SheetTitle>
              </SheetHeader>
              <PermissionsMobileContent
                currentPermissions={localPermissions}
                onSave={handleSavePermissions}
                onClose={() => setManagePermsOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Dialog open={managePermsOpen} onOpenChange={setManagePermsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-11">
              <Shield className="size-4" aria-hidden="true" />
              {t("actions.permissions")}
            </Button>
          </DialogTrigger>
          <ManagePermissionsDialogContent
            currentPermissions={localPermissions}
            onSave={handleSavePermissions}
            onOpenChange={setManagePermsOpen}
          />
        </Dialog>
      )}

      {/* Edit profile */}
      {isMobile ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 md:flex-none"
            onClick={() => setEditProfileOpen(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("actions.edit")}</span>
          </Button>
          <Sheet open={editProfileOpen} onOpenChange={setEditProfileOpen}>
            <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>{t("dialogs.edit_profile_title")}</SheetTitle>
              </SheetHeader>
              <EditProfileMobileContent
                user={user}
                onSave={handleSaveProfile}
                onClose={() => setEditProfileOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-11">
              <Pencil className="size-4" aria-hidden="true" />
              {t("actions.edit")}
            </Button>
          </DialogTrigger>
          <EditProfileDialogContent
            user={user}
            onSave={handleSaveProfile}
            onOpenChange={setEditProfileOpen}
          />
        </Dialog>
      )}

      {/* ⋮ More dropdown */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-11 px-2">
              <MoreHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only">{t("actions.more")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {user.type === "STAFF" && (
              <>
                <DropdownMenuItem>
                  <UserCog className="size-4 mr-2" aria-hidden="true" />
                  {t("actions.change_position")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MoveRight className="size-4 mr-2" aria-hidden="true" />
                  {t("actions.transfer_store")}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem>
              <KeyRound className="size-4 mr-2" aria-hidden="true" />
              {t("actions.reset_password")}
            </DropdownMenuItem>
            {/* FREELANCE-specific: block / activate */}
            {user.type === "FREELANCE" && (
              <>
                <DropdownMenuSeparator />
                {user.freelancer_status !== "BLOCKED" ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setBlockOpen(true)}
                  >
                    <BanIcon className="size-4 mr-2" aria-hidden="true" />
                    {t("actions.block")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleActivate}>
                    <UserCheck className="size-4 mr-2" aria-hidden="true" />
                    {t("actions.activate")}
                  </DropdownMenuItem>
                )}
                {(user.freelancer_status === "NEW" || user.freelancer_status === "VERIFICATION") && (
                  <DropdownMenuItem onClick={handleActivate}>
                    <UserCheck className="size-4 mr-2" aria-hidden="true" />
                    {t("actions.activate")}
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Archive className="size-4 mr-2" aria-hidden="true" />
                {t("actions.archive")}
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.archive_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.archive_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleArchive}
            >
              {tCommon("archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block dialog (FREELANCE only) */}
      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.block_dialog_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.block_dialog_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-0 pb-2">
            <Label htmlFor="block-reason" className="text-sm font-medium">
              {t("actions.block_reason_label")}
            </Label>
            <Textarea
              id="block-reason"
              className="mt-1.5 resize-none"
              rows={3}
              placeholder={t("actions.block_reason_placeholder")}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBlockReason("")}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBlock}
              disabled={blockLoading}
            >
              {t("actions.block_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
      <Card>
        <CardContent className="p-4 md:p-6">
          {/* Two-column flex on desktop; single-col stack on mobile */}
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

            {/* Left column: Avatar + identity */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="size-16 shrink-0 md:size-20">
                  <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col gap-1 min-w-0">
                  {/* Name + active dot */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold text-foreground text-balance md:text-2xl">
                      {fullName}
                    </h1>
                    {!user.archived && (
                      <span className="flex items-center gap-1" title={t("active_dot_label")}>
                        <span
                          className="size-2 rounded-full bg-success"
                          aria-label={t("active_dot_label")}
                        />
                      </span>
                    )}
                    {user.archived && (
                      <Badge variant="secondary">{t("archived_label")}</Badge>
                    )}
                    {user.type === "FREELANCE" && user.freelancer_status && (
                      <FreelancerStatusBadge status={user.freelancer_status} />
                    )}
                  </div>

                  {/* Position · Store */}
                  {activeAssignment && (
                    <p className="text-sm text-muted-foreground">
                      {activeAssignment.position_name}
                      {" · "}
                      <Link
                        href={ADMIN_ROUTES.storeDetail(String(activeAssignment.store_id))}
                        className="hover:text-foreground hover:underline underline-offset-2 transition-colors"
                      >
                        {activeAssignment.store_name}
                      </Link>
                    </p>
                  )}
                </div>
              </div>

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
              {user.type === "STAFF" && (
                localPermissions.length > 0 ? (
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
                      onClick={() => setManagePermsOpen(true)}
                      className="text-primary hover:underline underline-offset-2"
                    >
                      {t("permissions_assign")}
                    </button>
                  </p>
                )
              )}

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
            </div>

            {/* Right column: Action buttons */}
            <div className="shrink-0">
              {HeroActions}
            </div>
          </div>

          {/* Stats grid below hero */}
          {stats && (
            <div className="mt-6 border-t pt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
                  {stats.tasks_accepted}{" / "}{stats.tasks_rejected}
                </span>
              </div>
              <KpiCard
                label={t("stats.paused_now")}
                value={stats.paused_now}
                icon={Clock}
              />
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
                    <span className={`flex items-center gap-0.5 text-sm font-medium mb-0.5 ${stats.avg_completion_diff_min < 0 ? "text-success" : "text-destructive"}`}>
                      {stats.avg_completion_diff_min > 0 ? "+" : ""}{stats.avg_completion_diff_min} {t("stats.minutes_unit")} {t("stats.diff_vs_plan")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
        <ScrollArea className="w-full">
          <TabsList className="h-10 inline-flex w-auto min-w-full justify-start rounded-none border-b bg-transparent p-0">
            {(["profile", "tasks", "shifts", "permissions", "history"] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {t(`tabs.${tab}`)}
              </TabsTrigger>
            ))}
            {/* Documents tab */}
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t("tabs.documents")}
              {user.type === "STAFF" && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {t("documents.tab_optional")}
                </Badge>
              )}
            </TabsTrigger>
            {/* FREELANCE-only tabs */}
            {user.type === "FREELANCE" && (
              <>
                <TabsTrigger
                  value="services"
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {t("tabs.services")}
                </TabsTrigger>
                {user.payment_mode !== "CLIENT_DIRECT" && (
                  <TabsTrigger
                    value="payouts"
                    className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t("tabs.payouts")}
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="rating"
                  className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {t("tabs.rating")}
                </TabsTrigger>
              </>
            )}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* ── Profile tab ──────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-6">
          <ProfileTab user={user} locale={locale} formatDate={formatDate} formatTime={formatTime} t={t} />
        </TabsContent>

        {/* ── Tasks tab ────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-6">
          <TasksTab t={t} tCommon={tCommon} />
        </TabsContent>

        {/* ── Shifts tab ───────────────────────────────────────── */}
        <TabsContent value="shifts" className="mt-6">
          <ShiftsTab t={t} />
        </TabsContent>

        {/* ── Permissions tab ──────────────────────────────────── */}
        <TabsContent value="permissions" className="mt-6">
          <PermissionsTab
            user={user}
            localPermissions={localPermissions}
            onToggle={handleTogglePermission}
            t={t}
            tPerm={tPerm}
          />
        </TabsContent>

        {/* ── History tab ──────────────────────────────────────── */}
        <TabsContent value="history" className="mt-6">
          <HistoryTab user={user} locale={locale} formatTime={formatTime} t={t} />
        </TabsContent>

        {/* ── Documents tab ────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-6">
          <DocumentsTab user={user} t={t} locale={locale} formatDate={formatDate} />
        </TabsContent>

        {/* ── FREELANCE: Services tab ───────────────────────────── */}
        {user.type === "FREELANCE" && (
          <TabsContent value="services" className="mt-6">
            <FreelanceServicesTab
              freelancerId={userId}
              paymentMode={user.payment_mode ?? "NOMINAL_ACCOUNT"}
              locale={locale}
              formatDate={formatDate}
              t={t}
              tCommon={tCommon}
            />
          </TabsContent>
        )}

        {/* ── FREELANCE: Payouts tab ───────────────────────────── */}
        {user.type === "FREELANCE" && user.payment_mode !== "CLIENT_DIRECT" && (
          <TabsContent value="payouts" className="mt-6">
            <FreelancePayoutsTab
              freelancerId={userId}
              locale={locale}
              formatDate={formatDate}
              t={t}
              tCommon={tCommon}
            />
          </TabsContent>
        )}

        {/* ── FREELANCE: Rating tab ────────────────────────────── */}
        {user.type === "FREELANCE" && (
          <TabsContent value="rating" className="mt-6">
            <FreelanceRatingTab user={user} t={t} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE TAB
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  user: UserDetail
  locale: string
  formatDate: (iso: string | undefined | null, locale: string) => string
  formatTime: (iso: string | undefined | null, locale: string) => string
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

function ProfileTab({ user, locale, formatDate, formatTime, t }: ProfileTabProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// TASKS TAB (stub with empty state — real data integration out of scope)
// ─────────────────────────────────────────────────────────────────────────────

function TasksTab({
  t,
  tCommon,
}: {
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("tasks.filter_period")}: </span>
        <Badge variant="outline">{tCommon("month")}</Badge>
        <span className="text-sm text-muted-foreground ml-2">{t("tasks.filter_state")}: </span>
        <Badge variant="outline">{tCommon("all")}</Badge>
      </div>
      <EmptyState
        icon={Briefcase}
        title={t("tasks.empty")}
        description=""
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIFTS TAB (stub)
// ─────────────────────────────────────────────────────────────────────────────

function ShiftsTab({ t }: { t: ReturnType<typeof useTranslations<"screen.employeeDetail">> }) {
  return (
    <EmptyState
      icon={Clock}
      title={t("shifts.empty")}
      description=""
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

interface PermissionsTabProps {
  user: UserDetail
  localPermissions: Permission[]
  onToggle: (perm: Permission, enable: boolean) => Promise<void>
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tPerm: ReturnType<typeof useTranslations<"permission">>
}



const PERM_DESCS: Record<Permission, string> = {
  CASHIER: "Работа на кассе и обслуживание покупателей",
  SALES_FLOOR: "Работа в торговом зале, выкладка товаров",
  SELF_CHECKOUT: "Обслуживание зоны самообслуживания",
  WAREHOUSE: "Работа на складе, приёмка и выдача товаров",
  PRODUCTION_LINE: "Работа на производственной линии",
}

const PERM_KEY_MAP: Record<Permission, string> = {
  CASHIER: "cashier",
  SALES_FLOOR: "sales_floor",
  SELF_CHECKOUT: "self_checkout",
  WAREHOUSE: "warehouse",
  PRODUCTION_LINE: "production_line",
}

function PermissionsTab({ user, localPermissions, onToggle, t, tPerm }: PermissionsTabProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY TAB (mock timeline)
// ─────────────────────────────────────────────────────────────────────────────

interface HistoryTabProps {
  user: UserDetail
  locale: string
  formatTime: (iso: string | undefined | null, locale: string) => string
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

const MOCK_HISTORY = [
  { id: "h1", occurred_at: "2026-04-15T10:22:00Z", actor: "Романов И. А.", action_label: "Назначена привилегия SELF_CHECKOUT", type: "permission_granted" },
  { id: "h2", occurred_at: "2024-09-01T09:00:00Z", actor: "Иванов А. С.",  action_label: "Назначена привилегия SELF_CHECKOUT", type: "permission_granted" },
  { id: "h3", occurred_at: "2024-03-20T08:30:00Z", actor: "Романов И. А.", action_label: "Назначены привилегии CASHIER, SALES_FLOOR", type: "permission_granted" },
  { id: "h4", occurred_at: "2024-03-15T07:00:00Z", actor: "Системная миграция", action_label: "Сотрудник добавлен в систему", type: "system" },
]

function HistoryTab({ user, locale, formatTime, t }: HistoryTabProps) {
  if (MOCK_HISTORY.length === 0) {
    return <EmptyState icon={FileText} title={t("history.empty")} description="" />
  }
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <ol className="flex flex-col">
          {MOCK_HISTORY.map((item, idx) => (
            <li key={item.id} className="flex gap-3 group">
              <div className="flex flex-col items-center shrink-0">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted mt-0.5">
                  <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                </span>
                {idx < MOCK_HISTORY.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 mb-1" aria-hidden="true" />
                )}
              </div>
              <div className={`flex flex-col gap-0.5 pb-4 min-w-0 flex-1 ${idx === MOCK_HISTORY.length - 1 ? "pb-0" : ""}`}>
                <p className="text-sm text-foreground">
                  <span className="font-medium">{item.actor}</span>
                  {" — "}
                  {item.action_label}
                </p>
                <time className="text-xs text-muted-foreground">
                  {formatTime(item.occurred_at, locale)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  user: UserDetail
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  locale: string
  formatDate: (iso: string | undefined | null, locale: string) => string
}

const DOC_LABELS = {
  PASSPORT: "documents.doc_passport",
  INN: "documents.doc_inn",
  SNILS: "documents.doc_snils",
  CONTRACT: "documents.doc_contract",
} as const

const FREELANCE_DOCS = [
  { type: "PASSPORT" as const },
  { type: "INN" as const },
  { type: "SNILS" as const },
  { type: "CONTRACT" as const },
]

function DocumentsTab({ user, t, locale, formatDate }: DocumentsTabProps) {
  const allMissing =
    user.type === "FREELANCE" &&
    (!user.freelance_documents || user.freelance_documents.every((d) => !d.uploaded_at))

  return (
    <div className="flex flex-col gap-4">
      {user.type === "FREELANCE" && allMissing && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{t("documents.freelance_required_alert")}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FREELANCE_DOCS.map((doc) => {
          const found = user.freelance_documents?.find((d) => d.type === doc.type)
          const uploaded = found?.uploaded_at ?? null
          const isRequired = user.type === "FREELANCE"

          return (
            <Card key={doc.type}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {/* File preview placeholder */}
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center border">
                    <FileText className="size-10 text-muted-foreground" strokeWidth={1.5} />
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{t(DOC_LABELS[doc.type])}</span>
                      {uploaded ? (
                        <span className="text-xs text-muted-foreground">
                          {t("documents.uploaded_at", { date: formatDate(uploaded, locale) })}
                        </span>
                      ) : (
                        <Badge
                          variant={isRequired ? "destructive" : "secondary"}
                          className="w-fit text-xs"
                        >
                          {t("documents.not_uploaded")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {uploaded ? (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 min-h-11">
                          {t("documents.download")}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 min-h-11">
                          {t("documents.replace")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="w-full min-h-11">
                        {t("documents.upload")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE SHEET CONTENT HELPERS (avoid re-implementing dialogs in sheets)
// ─────────────────────────────────────────────────────────────────────────────

interface EditProfileMobileContentProps {
  user: UserDetail
  onSave: (data: EditProfileData) => Promise<void>
  onClose: () => void
}

function EditProfileMobileContent({ user, onSave, onClose }: EditProfileMobileContentProps) {
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

interface PermissionsMobileContentProps {
  currentPermissions: Permission[]
  onSave: (permissions: Permission[]) => Promise<void>
  onClose: () => void
}

function PermissionsMobileContent({ currentPermissions, onSave, onClose }: PermissionsMobileContentProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// FREELANCE OFFER CARD
// ─────────────────────────────────────────────────────────────────────────────

interface FreelanceOfferCardProps {
  user: UserDetail
  locale: string
  formatDate: (iso: string | undefined | null, locale: string) => string
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
  onSendLink: () => Promise<void>
}

function FreelanceOfferCard({ user, locale, formatDate, t, tCommon, onSendLink }: FreelanceOfferCardProps) {
  const isSigned = !!user.oferta_accepted_at
  const [open, setOpen] = useState(!isSigned)
  const [sending, setSending] = useState(false)

  async function handleSend() {
    setSending(true)
    try {
      await onSendLink()
    } finally {
      setSending(false)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">{t("freelance_hero.offer_card_title")}</CardTitle>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                    isSigned
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {isSigned ? (
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-3" aria-hidden="true" />
                  )}
                  {isSigned ? t("freelance_hero.offer_signed") : t("freelance_hero.offer_not_signed")}
                </span>
              </div>
              {open ? (
                <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="flex flex-col gap-3">
              {isSigned && user.oferta_accepted_at && (
                <p className="text-sm text-muted-foreground">
                  {t("freelance_hero.offer_signed_at", {
                    date: formatDate(user.oferta_accepted_at, locale),
                  })}
                </p>
              )}
              {!isSigned && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit min-h-9"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? tCommon("loading") : t("freelance_hero.offer_send_link")}
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FREELANCE SERVICES TAB
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_STATUS_CLASS: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-info/10 text-info",
  COMPLETED: "bg-warning/10 text-warning",
  CONFIRMED: "bg-success/10 text-success",
  READY_TO_PAY: "bg-success/10 text-success",
  PAID: "bg-success/10 text-success",
  NO_SHOW: "bg-destructive/10 text-destructive",
  DISPUTED: "bg-destructive/10 text-destructive",
}

interface FreelanceServicesTabProps {
  freelancerId: number
  paymentMode: "NOMINAL_ACCOUNT" | "CLIENT_DIRECT"
  locale: string
  formatDate: (iso: string | undefined | null, locale: string) => string
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
}

function FreelanceServicesTab({ freelancerId, paymentMode, locale, formatDate, t, tCommon }: FreelanceServicesTabProps) {
  const [services, setServices] = useState<Service[]>([])
  const [total, setTotal] = useState(0)
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading")
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  useEffect(() => {
    setLoadState("loading")
    getServices({ freelancer_id: freelancerId, page_size: 50 })
      .then((res) => {
        setServices(res.data)
        setTotal(res.total ?? 0)
        setLoadState("loaded")
      })
      .catch(() => setLoadState("error"))
  }, [freelancerId])

  const tFreelance = useTranslations("freelance")

  if (loadState === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    )
  }

  if (loadState === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{tCommon("error")}</AlertDescription>
      </Alert>
    )
  }

  if (services.length === 0) {
    return <EmptyState icon={Briefcase} title={t("services_tab.empty")} description="" />
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("services_tab.col_date")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("services_tab.col_store")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t("services_tab.col_work_type")}</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("services_tab.col_hours")}</th>
              {paymentMode === "NOMINAL_ACCOUNT" && (
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">{t("services_tab.col_amount")}</th>
              )}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("services_tab.col_status")}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => (
              <tr
                key={svc.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedService(svc)}
              >
                <td className="px-4 py-3 text-foreground whitespace-nowrap">
                  {formatDate(svc.service_date, locale)}
                </td>
                <td className="px-4 py-3 text-foreground truncate max-w-[140px]">{svc.store_name}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[160px]">
                  {svc.work_type_name}
                </td>
                <td className="px-4 py-3 text-right text-foreground">{svc.actual_hours ?? svc.scheduled_hours}</td>
                {paymentMode === "NOMINAL_ACCOUNT" && (
                  <td className="px-4 py-3 text-right text-foreground hidden md:table-cell">
                    {svc.total_amount != null
                      ? new Intl.NumberFormat(locale === "en" ? "en-GB" : "ru-RU", {
                          style: "currency",
                          currency: locale === "en" ? "GBP" : "RUB",
                          maximumFractionDigits: 0,
                        }).format(svc.total_amount)
                      : "—"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${SERVICE_STATUS_CLASS[svc.status] ?? "bg-muted text-muted-foreground"}`}>
                    {tFreelance(`service.status.${svc.status}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Service detail sheet */}
      <Sheet open={!!selectedService} onOpenChange={(v) => { if (!v) setSelectedService(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{t("services_tab.sheet_title")}</SheetTitle>
          </SheetHeader>
          {selectedService && (
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_date")}</dt>
                <dd className="text-sm text-foreground mt-0.5">{formatDate(selectedService.service_date, locale)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_store")}</dt>
                <dd className="text-sm text-foreground mt-0.5">{selectedService.store_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_work_type")}</dt>
                <dd className="text-sm text-foreground mt-0.5">{selectedService.work_type_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_hours")}</dt>
                <dd className="text-sm text-foreground mt-0.5">{selectedService.actual_hours ?? selectedService.scheduled_hours} ч.</dd>
              </div>
              {selectedService.total_amount != null && (
                <div>
                  <dt className="text-xs text-muted-foreground">{t("services_tab.col_amount")}</dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {new Intl.NumberFormat(locale === "en" ? "en-GB" : "ru-RU", {
                      style: "currency",
                      currency: locale === "en" ? "GBP" : "RUB",
                      maximumFractionDigits: 0,
                    }).format(selectedService.total_amount)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">{t("services_tab.col_status")}</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${SERVICE_STATUS_CLASS[selectedService.status] ?? "bg-muted text-muted-foreground"}`}>
                    {tFreelance(`service.status.${selectedService.status}`)}
                  </span>
                </dd>
              </div>
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FREELANCE PAYOUTS TAB
// ─────────────────────────────────────────────────────────────────────────────

interface FreelancePayoutsTabProps {
  freelancerId: number
  locale: string
  formatDate: (iso: string | undefined | null, locale: string) => string
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
  tCommon: ReturnType<typeof useTranslations<"common">>
}

function FreelancePayoutsTab({ freelancerId, locale, formatDate, t, tCommon }: FreelancePayoutsTabProps) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading")

  useEffect(() => {
    setLoadState("loading")
    getPayouts({ freelancer_id: freelancerId, page_size: 50 })
      .then((res) => {
        setPayouts(res.data)
        setLoadState("loaded")
      })
      .catch(() => setLoadState("error"))
  }, [freelancerId])

  const tFreelance = useTranslations("freelance")

  const PAYOUT_STATUS_CLASS: Record<string, string> = {
    PENDING: "bg-muted text-muted-foreground",
    PROCESSING: "bg-info/10 text-info",
    PAID: "bg-success/10 text-success",
    FAILED: "bg-destructive/10 text-destructive",
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "ru-RU", {
      style: "currency",
      currency: locale === "en" ? "GBP" : "RUB",
      maximumFractionDigits: 0,
    }).format(amount)

  if (loadState === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    )
  }

  if (loadState === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{tCommon("error")}</AlertDescription>
      </Alert>
    )
  }

  if (payouts.length === 0) {
    return <EmptyState icon={FileText} title={t("payouts_tab.empty")} description="" />
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("payouts_tab.col_date")}</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("payouts_tab.col_gross")}</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">{t("payouts_tab.col_commission")}</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("payouts_tab.col_net")}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("payouts_tab.col_status")}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t("payouts_tab.col_action")}</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-foreground whitespace-nowrap">
                {formatDate(payout.payout_date, locale)}
              </td>
              <td className="px-4 py-3 text-right text-foreground">{formatCurrency(payout.gross_amount)}</td>
              <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                {payout.nominal_account_fee != null ? formatCurrency(payout.nominal_account_fee) : "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(payout.net_amount)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${PAYOUT_STATUS_CLASS[payout.status] ?? "bg-muted text-muted-foreground"}`}>
                  {tFreelance(`payout.status.${payout.status}`)}
                </span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                {payout.closing_doc_url && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                    <Download className="size-3.5" aria-hidden="true" />
                    {t("payouts_tab.download_act")}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FREELANCE RATING TAB
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_FREELANCE_RATING = {
  overall: 4.2,
  criteria: [
    { key: "criteria_shift_show",    score: 4.8, max: 5 },
    { key: "criteria_task_speed",    score: 4.1, max: 5 },
    { key: "criteria_task_quality",  score: 4.5, max: 5 },
    { key: "criteria_rework",        score: 3.9, max: 5 },
    { key: "criteria_relative_speed",score: 4.0, max: 5 },
    { key: "criteria_total_tasks",   score: 87, max: 200, isCount: true },
    { key: "criteria_experience",    score: 9, max: 24, isCount: true, unit: "мес." },
  ],
}

interface FreelanceRatingTabProps {
  user: UserDetail
  t: ReturnType<typeof useTranslations<"screen.employeeDetail">>
}

function FreelanceRatingTab({ user, t }: FreelanceRatingTabProps) {
  const hasRating = user.rating != null || (user.freelancer_status === "ACTIVE")

  if (!hasRating) {
    return (
      <EmptyState icon={Star} title={t("rating_tab.no_data")} description="" />
    )
  }

  const ratingData = MOCK_FREELANCE_RATING

  return (
    <div className="flex flex-col gap-6">
      {/* Overall rating card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl font-bold text-primary">{ratingData.overall.toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">{t("rating_tab.overall")}</span>
              <div className="flex items-center gap-1" aria-label={`${ratingData.overall} out of 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-4 ${star <= Math.round(ratingData.overall) ? "text-warning fill-warning" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-criteria breakdown */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-5">
            {ratingData.criteria.map((c) => (
              <div key={c.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">
                    {t(`rating_tab.${c.key}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-sm font-medium text-foreground shrink-0">
                    {c.isCount ? c.score : `${c.score.toFixed(1)} / ${c.max}`}
                    {c.unit ? ` ${c.unit}` : ""}
                  </span>
                </div>
                {!c.isCount && (
                  <Progress
                    value={(c.score / c.max) * 100}
                    className="h-1.5"
                    aria-label={`${c.score} out of ${c.max}`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
