"use client"

import { useEffect, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import {
  ArrowLeft, Send, Star, Phone, MapPin, Calendar as CalIcon,
  CheckCircle2, Clock, AlertTriangle, FileText, Building2,
} from "lucide-react"

import {
  getFreelancerById,
  getFreelancerAssignments,
  type FreelancerWithStats,
} from "@/lib/api"
import type { FreelancerAssignment } from "@/lib/types"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { formatRelative } from "@/lib/utils/format"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge"
import { PageHeader } from "@/components/shared/page-header"

import { OfferTaskDialogContent } from "./offer-task-dialog-content"

interface Props {
  freelancerId: number
}

export function FreelancerDetail({ freelancerId }: Props) {
  const t = useTranslations("screen.freelancerDetail")
  const tStatus = useTranslations("screen.freelancers")
  const locale = useLocale()

  const [data, setData] = useState<FreelancerWithStats | null>(null)
  const [assignments, setAssignments] = useState<FreelancerAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offerOpen, setOfferOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [det, asg] = await Promise.all([
        getFreelancerById(freelancerId),
        getFreelancerAssignments(freelancerId),
      ])
      setData(det.data)
      setAssignments(asg.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_load"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freelancerId])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-screen-xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6 max-w-screen-xl mx-auto">
        <EmptyState
          icon={AlertTriangle}
          title={t("not_found_title")}
          description={error ?? t("not_found_desc")}
          action={{ label: t("back_to_list"), onClick: () => window.history.back() }}
        />
      </div>
    )
  }

  const fio = `${data.last_name} ${data.first_name}${data.middle_name ? ` ${data.middle_name}` : ""}`
  const initials = `${data.last_name[0] ?? ""}${data.first_name[0] ?? ""}`
  const canOffer = data.freelancer_status === "ACTIVE"

  const upcoming = assignments.filter(
    (a) => a.status === "SCHEDULED" || a.status === "CHECKED_IN" || a.status === "WORKING",
  )
  const history = assignments.filter(
    (a) => a.status === "DONE" || a.status === "NO_SHOW",
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto">
      <PageHeader
        title={fio}
        breadcrumbs={[
          { label: t("breadcrumb_home"), href: "/dashboard" },
          { label: t("breadcrumb_freelance"), href: ADMIN_ROUTES.freelanceAgents },
          { label: t("breadcrumb_freelancers"), href: ADMIN_ROUTES.freelanceFreelancers },
          { label: fio },
        ]}
      />

      {/* Hero */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <Avatar className="size-16 shrink-0">
                <AvatarImage src={data.avatar_url} alt="" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {data.freelancer_status && (
                    <FreelancerStatusBadge status={data.freelancer_status} />
                  )}
                  {data.is_available && (
                    <Badge variant="outline" className="border-success/40 text-success">
                      {tStatus("badge_available")}
                    </Badge>
                  )}
                  {data.rating !== null && data.rating !== undefined && (
                    <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                      <Star className="size-3.5 fill-warning text-warning" />
                      {data.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-semibold text-balance">{fio}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" />
                    {data.phone}
                  </span>
                  {data.agent_name ? (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3.5" />
                      <Link
                        href={data.agent_id ? `/freelance/agents/${data.agent_id}` : "#"}
                        className="hover:underline"
                      >
                        {data.agent_name}
                      </Link>
                    </span>
                  ) : (
                    <span className="text-warning">{tStatus("no_agent")}</span>
                  )}
                  {data.preferred_timezone && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {data.preferred_timezone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={() => setOfferOpen(true)} disabled={!canOffer} className="md:shrink-0">
              <Send className="size-4 mr-1.5" />
              {tStatus("row_actions.offer_task")}
            </Button>
          </div>

          {/* Stats grid */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={t("stat_completed_30d")} value={data.completed_30d} />
            <Stat label={t("stat_active_now")} value={data.active_assignments} />
            <Stat label={t("stat_total_lifetime")} value={history.length + data.active_assignments + data.completed_30d} />
            <Stat label={t("stat_joined")} value={data.hired_at ? formatRelative(new Date(data.hired_at), locale === "en" ? "en" : "ru") : "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">
            {t("tabs.assignments")}
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {upcoming.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
          <TabsTrigger value="documents">{t("tabs.documents")}</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalIcon}
              title={t("upcoming_empty_title")}
              description={t("upcoming_empty_desc")}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((a) => (
                <AssignmentRow key={a.id} assignment={a} locale={locale} t={t} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={t("history_empty_title")}
              description={t("history_empty_desc")}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((a) => (
                <AssignmentRow key={a.id} assignment={a} locale={locale} t={t} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4" />
                {t("documents_title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{t("oferta")}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.oferta_accepted_at
                      ? t("oferta_signed", { date: new Date(data.oferta_accepted_at).toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU") })
                      : t("oferta_unsigned")}
                  </div>
                </div>
                {data.oferta_accepted_at ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <AlertTriangle className="size-5 text-warning" />
                )}
              </div>
              {data.agent_id && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{t("agent_link")}</div>
                    <div className="text-xs text-muted-foreground">{data.agent_name}</div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/freelance/agents/${data.agent_id}`}>
                      {t("open_agent")}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Offer dialog */}
      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <OfferTaskDialogContent
          freelancer={data}
          onClose={() => setOfferOpen(false)}
          onSent={load}
        />
      </Dialog>

      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ADMIN_ROUTES.freelanceFreelancers}>
            <ArrowLeft className="size-4 mr-1.5" />
            {t("back_to_list")}
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground leading-tight">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

interface AssignmentRowProps {
  assignment: FreelancerAssignment
  locale: string
  t: ReturnType<typeof useTranslations>
}

function AssignmentRow({ assignment: a, locale, t }: AssignmentRowProps) {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso))

  return (
    <Card>
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {fmt(a.scheduled_start)} – {fmt(a.scheduled_end).slice(-5)}
          </div>
          <div className="text-xs text-muted-foreground">
            {t(`status.${a.status.toLowerCase()}`)}
            {a.agent_name && ` · ${a.agent_name}`}
          </div>
        </div>
        <AssignmentStatusBadge status={a.status} />
      </CardContent>
    </Card>
  )
}

function AssignmentStatusBadge({ status }: { status: FreelancerAssignment["status"] }) {
  const t = useTranslations("screen.freelancerDetail.status")
  const map: Record<typeof status, string> = {
    SCHEDULED: "bg-info/10 text-info border-info/20",
    CHECKED_IN: "bg-warning/10 text-warning border-warning/20",
    WORKING: "bg-warning/10 text-warning border-warning/20",
    DONE: "bg-success/10 text-success border-success/20",
    NO_SHOW: "bg-destructive/10 text-destructive border-destructive/20",
  }
  return <Badge className={map[status]}>{t(status.toLowerCase())}</Badge>
}
