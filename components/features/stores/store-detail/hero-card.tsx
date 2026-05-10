"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  Store as StoreIcon,
  MapPin,
  Plus,
  CalendarDays,
  Pencil,
  MoreHorizontal,
  Archive,
  RefreshCw,
  Users,
  Clock,
  AlertCircle,
  LayoutGrid,
  Activity,
  UserCog,
} from "lucide-react"

import type { StoreDetail as StoreDetailData } from "@/lib/api"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DetailPageHero, StatTile } from "@/components/shared"

import { formatRelative } from "./_shared"

interface StoreHeroCardProps {
  data: StoreDetailData
  storeId: number
  locale: string
  lamaColor: string
  onEdit: () => void
  onArchive: () => void
}

export function StoreHeroCard({
  data,
  storeId,
  locale,
  lamaColor,
  onEdit,
  onArchive,
}: StoreHeroCardProps) {
  const t = useTranslations("screen.storeDetail")

  const leading = (
    <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
      <StoreIcon className="size-7" />
    </div>
  )

  const subtitle = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {data.external_code}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {data.store_type}
        </Badge>
        {data.archived ? (
          <Badge variant="destructive" className="text-xs">
            {t("hero.archived_badge")}
          </Badge>
        ) : (
          <Badge className="text-xs bg-success/15 text-success border-0 hover:bg-success/20">
            {t("hero.active_badge")}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-3.5 shrink-0" />
        <span>{data.address_full}</span>
      </div>
    </div>
  )

  const meta = (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {data.manager && (
        <span className="flex items-center gap-1">
          <Users className="size-3.5" />
          {t("hero.manager_label")}:{" "}
          <span className="font-medium text-foreground">
            {data.manager.last_name} {data.manager.first_name[0]}.
          </span>
        </span>
      )}
      {data.supervisor && (
        <span className="flex items-center gap-1">
          <UserCog className="size-3.5" />
          {t("hero.supervisor_label")}:{" "}
          <span className="font-medium text-foreground">
            {data.supervisor.last_name} {data.supervisor.first_name[0]}.
          </span>
        </span>
      )}
      <span className={`flex items-center gap-1 ${lamaColor}`}>
        <RefreshCw className="size-3.5" />
        {data.last_synced_at
          ? t("hero.lama_synced", { ago: formatRelative(data.last_synced_at, locale) })
          : t("hero.lama_never")}
      </span>
    </div>
  )

  const actions = (
    <>
      <Button size="sm" asChild>
        <Link href={`${ADMIN_ROUTES.taskNew}?store_id=${storeId}`}>
          <Plus className="size-4" />
          {t("actions.create_task")}
        </Link>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <Link href={`${ADMIN_ROUTES.schedule}?store_id=${storeId}`}>
          <CalendarDays className="size-4" />
          {t("actions.schedule")}
        </Link>
      </Button>
      <Button size="sm" variant="outline" onClick={onEdit}>
        <Pencil className="size-4" />
        {t("actions.edit")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" aria-label={t("actions.more")}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!data.archived && (
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={onArchive}
            >
              <Archive className="size-4" />
              {t("actions.archive")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  const statsSlot = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <StatTile label={t("hero.kpi.team")} value={data.team_count} icon={<Users className="size-3.5" />} />
      <StatTile label={t("hero.kpi.team_active")} value={data.team_active_count} icon={<Activity className="size-3.5" />} />
      <StatTile label={t("hero.kpi.tasks_today")} value={data.kpi.tasks_today} icon={<Clock className="size-3.5" />} />
      <StatTile
        label={t("hero.kpi.on_review")}
        value={data.kpi.on_review_today}
        icon={<AlertCircle className="size-3.5" />}
        warn={data.kpi.on_review_today > 0}
      />
      <StatTile label={t("hero.kpi.zones")} value={data.zones.length} icon={<LayoutGrid className="size-3.5" />} />
      <StatTile
        label={t("hero.kpi.lama_sync")}
        value={data.last_synced_at ? formatRelative(data.last_synced_at, locale) : "—"}
        icon={<RefreshCw className="size-3.5" />}
        colorClass={lamaColor}
      />
    </div>
  )

  return (
    <DetailPageHero
      leading={leading}
      title={`${data.external_code} — ${data.address_full}`}
      subtitle={subtitle}
      meta={meta}
      actions={actions}
      statsSlot={statsSlot}
    />
  )
}
