"use client"

import * as React from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useQueryState, parseAsString, parseAsInteger } from "nuqs"
import { type ColumnDef } from "@tanstack/react-table"
import { MoreVertical, Send, ExternalLink, Star, Users } from "lucide-react"

import type { FreelancerStatus } from "@/lib/types"
import { getFreelancers, getAgents, type FreelancerWithStats } from "@/lib/api"
import type { Agent } from "@/lib/types"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table"
import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge"

import { OfferTaskDialogContent } from "./offer-task-dialog-content"

type FreelancerTab = "active" | "archived"

const TAB_STATUS_MAP: Record<FreelancerTab, FreelancerStatus | undefined> = {
  active: "ACTIVE",
  archived: "ARCHIVED",
}

export function FreelancersList() {
  const t = useTranslations("screen.freelancers")
  const locale = useLocale()
  const router = useRouter()

  const [tabParam, setTabParam] = useQueryState(
    "tab",
    parseAsString.withDefault("active"),
  )
  const [searchParam, setSearchParam] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  )
  const [agentParam, setAgentParam] = useQueryState("agent_id", parseAsString)
  const [pageParam, setPageParam] = useQueryState(
    "page",
    parseAsInteger.withDefault(1),
  )

  const [availableOnly, setAvailableOnly] = React.useState(false)

  const tab = (tabParam as FreelancerTab) ?? "active"

  const [data, setData] = React.useState<FreelancerWithStats[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [agents, setAgents] = React.useState<Agent[]>([])

  const [offeringTo, setOfferingTo] = React.useState<FreelancerWithStats | null>(null)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getFreelancers({
        status: TAB_STATUS_MAP[tab],
        agent_id: agentParam ?? undefined,
        available_only: availableOnly || undefined,
        search: searchParam || undefined,
        page: pageParam,
        page_size: 20,
      })
      setData(result.data)
      setTotal(result.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_load"))
    } finally {
      setLoading(false)
    }
  }, [tab, agentParam, availableOnly, searchParam, pageParam, t])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  React.useEffect(() => {
    getAgents({ status: "ACTIVE", page_size: 100 })
      .then((res) => setAgents(res.data))
      .catch(() => setAgents([]))
  }, [])

  // ── Counts per tab (loaded once) ────────────────────────────────────
  const [counts, setCounts] = React.useState({ active: 0, archived: 0 })
  React.useEffect(() => {
    Promise.all([
      getFreelancers({ status: "ACTIVE", page_size: 1 }),
      getFreelancers({ status: "ARCHIVED", page_size: 1 }),
    ]).then(([a, ar]) => setCounts({ active: a.total, archived: ar.total }))
      .catch(() => undefined)
  }, [])

  // ── Columns ─────────────────────────────────────────────────────────
  const columns: ColumnDef<FreelancerWithStats>[] = React.useMemo(
    () => [
      {
        id: "name",
        header: t("columns.name"),
        cell: ({ row }) => {
          const f = row.original
          const initials = `${f.last_name[0] ?? ""}${f.first_name[0] ?? ""}`
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={f.avatar_url} alt="" />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {f.last_name} {f.first_name}
                  {f.middle_name ? ` ${f.middle_name}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{f.phone}</span>
              </div>
            </div>
          )
        },
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: ({ row }) => {
          const f = row.original
          if (!f.freelancer_status) return null
          return (
            <div className="flex items-center gap-1.5">
              <FreelancerStatusBadge status={f.freelancer_status} size="sm" />
              {f.is_available && (
                <Badge variant="outline" className="text-xs border-success/40 text-success">
                  {t("badge_available")}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        id: "agent",
        header: t("columns.agent"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate block max-w-[180px]">
            {row.original.agent_name ?? t("no_agent")}
          </span>
        ),
      },
      {
        id: "rating",
        header: t("columns.rating"),
        size: 90,
        cell: ({ row }) => {
          const r = row.original.rating
          if (r === null || r === undefined) return <span className="text-xs text-muted-foreground">—</span>
          return (
            <div className="flex items-center gap-1 tabular-nums">
              <Star className="size-3.5 fill-warning text-warning" />
              <span className="text-sm">{r.toFixed(1)}</span>
            </div>
          )
        },
      },
      {
        id: "completed_30d",
        header: t("columns.completed_30d"),
        size: 110,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{row.original.completed_30d}</span>
        ),
      },
      {
        id: "hired_at",
        header: t("columns.joined_at"),
        size: 110,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.hired_at, locale)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 50,
        cell: ({ row }) => {
          const f = row.original
          const canOffer = f.freelancer_status === "ACTIVE"
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t("row_actions.menu")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(ADMIN_ROUTES.freelanceFreelancerDetail(f.id))
                  }}
                >
                  <ExternalLink className="size-4 mr-2" />
                  {t("row_actions.open_profile")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canOffer}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOfferingTo(f)
                  }}
                >
                  <Send className="size-4 mr-2" />
                  {t("row_actions.offer_task")}
                </DropdownMenuItem>
                {f.agent_id && (
                  <DropdownMenuItem asChild>
                    <a
                      href={`/freelance/agents/${f.agent_id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-4 mr-2" />
                      {t("row_actions.open_agent")}
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [t, locale],
  )

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-screen-2xl mx-auto">
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumb_home"), href: "/dashboard" },
          { label: t("breadcrumb_freelance"), href: "/freelance/agents" },
          { label: t("breadcrumb_freelancers") },
        ]}
      />

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTabParam(v === "active" ? null : v)
          setPageParam(null)
        }}
      >
        <TabsList className="h-9">
          <TabsTrigger value="active">
            {t("tabs.active")}
            {counts.active > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {counts.active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            {t("tabs.archived")}
            {counts.archived > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {counts.archived}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] md:max-w-sm">
          <Input
            placeholder={t("filters.search_placeholder")}
            value={searchParam}
            onChange={(e) => {
              setSearchParam(e.target.value || null)
              setPageParam(null)
            }}
            className="h-9"
          />
        </div>
        <Select
          value={agentParam ?? "all"}
          onValueChange={(v) => {
            setAgentParam(v === "all" ? null : v)
            setPageParam(null)
          }}
        >
          <SelectTrigger className="h-9 md:w-[200px]">
            <SelectValue placeholder={t("filters.agent")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.agent_any")}</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-3 h-9 rounded-md border">
          <Switch
            id="available-only"
            checked={availableOnly}
            onCheckedChange={(v) => {
              setAvailableOnly(v)
              setPageParam(null)
            }}
          />
          <Label htmlFor="available-only" className="text-sm cursor-pointer">
            {t("filters.available_only")}
          </Label>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Users}
          title={t("error_title")}
          description={error}
          action={{ label: t("retry"), onClick: () => fetchData() }}
        />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("empty_title")}
          description={t("empty_desc")}
        />
      ) : (
        <ResponsiveDataTable
          columns={columns}
          data={data}
          onRowClick={(f) => router.push(ADMIN_ROUTES.freelanceFreelancerDetail(f.id))}
          mobileCardRender={(f) => (
            <FreelancerCard
              freelancer={f}
              onOffer={() => setOfferingTo(f)}
              onOpen={() => router.push(ADMIN_ROUTES.freelanceFreelancerDetail(f.id))}
              t={t}
            />
          )}
        />
      )}

      {/* Pagination summary */}
      {!loading && total > 0 && (
        <div className="text-xs text-muted-foreground">
          {t("pagination_info", {
            from: (pageParam - 1) * 20 + 1,
            to: Math.min(pageParam * 20, total),
            total,
          })}
        </div>
      )}

      {/* Offer dialog */}
      <Dialog open={offeringTo !== null} onOpenChange={(v) => !v && setOfferingTo(null)}>
        {offeringTo && (
          <OfferTaskDialogContent
            freelancer={offeringTo}
            onClose={() => setOfferingTo(null)}
            onSent={fetchData}
          />
        )}
      </Dialog>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

interface CardProps {
  freelancer: FreelancerWithStats
  onOffer: () => void
  onOpen: () => void
  t: ReturnType<typeof useTranslations>
}

function FreelancerCard({ freelancer: f, onOffer, onOpen, t }: CardProps) {
  const initials = `${f.last_name[0] ?? ""}${f.first_name[0] ?? ""}`
  const canOffer = f.freelancer_status === "ACTIVE"
  return (
    <div className="flex flex-col gap-3 p-3" onClick={onOpen} role="button" tabIndex={0}>
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={f.avatar_url} alt="" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {f.last_name} {f.first_name}
            {f.middle_name ? ` ${f.middle_name}` : ""}
          </div>
          <div className="text-xs text-muted-foreground">{f.phone}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {f.freelancer_status && (
              <FreelancerStatusBadge status={f.freelancer_status} size="sm" />
            )}
            {f.is_available && (
              <Badge variant="outline" className="text-xs border-success/40 text-success">
                {t("badge_available")}
              </Badge>
            )}
            {f.rating !== null && f.rating !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs tabular-nums">
                <Star className="size-3 fill-warning text-warning" />
                {f.rating.toFixed(1)}
              </span>
            )}
          </div>
          {f.agent_name && (
            <div className="mt-1 text-xs text-muted-foreground truncate">
              {f.agent_name}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-base font-semibold tabular-nums">{f.completed_30d}</div>
          <div className="text-xs text-muted-foreground leading-tight">
            {t("card.completed_30d")}
          </div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <div className="text-base font-semibold tabular-nums">{f.active_assignments}</div>
          <div className="text-xs text-muted-foreground leading-tight">
            {t("card.active_now")}
          </div>
        </div>
      </div>
      <Button
        onClick={(e) => { e.stopPropagation(); onOffer() }}
        disabled={!canOffer}
        size="sm"
        className="w-full"
      >
        <Send className="size-4 mr-1.5" />
        {t("row_actions.offer_task")}
      </Button>
    </div>
  )
}
