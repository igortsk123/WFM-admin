"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const OverviewWeekChart = dynamic(
  () => import("./overview-week-chart").then((m) => m.OverviewWeekChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-full" />,
  }
)

import type { StoreDetail as StoreDetailData } from "@/lib/api"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { ActivityFeed } from "@/components/shared/activity-feed"
import type { ActivityItem } from "@/components/shared/activity-feed"

import { buildWeekActivity, getInitials } from "./_shared"

interface StoreOverviewTabProps {
  data: StoreDetailData
  storeId: number
  activityItems: ActivityItem[]
  addressCopied: boolean
  onCopyAddress: () => void
}

export function StoreOverviewTab({
  data,
  storeId,
  activityItems,
  addressCopied,
  onCopyAddress,
}: StoreOverviewTabProps) {
  const t = useTranslations("screen.storeDetail")
  const weekData = buildWeekActivity(storeId)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left col-span-2 */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        {/* Weekly activity bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("overview.activity_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <OverviewWeekChart data={weekData} />
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm inline-block bg-[var(--color-chart-2)]" />
                План
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm inline-block bg-[var(--color-chart-1)]" />
                Факт
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("overview.feed_title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={activityItems} />
          </CardContent>
        </Card>
      </div>

      {/* Right col-1 sticky */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        {/* Manager card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("overview.manager_card")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.manager ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={data.manager.avatar_url} alt={`${data.manager.last_name} ${data.manager.first_name}`} />
                    <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                      {getInitials(data.manager.first_name, data.manager.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {data.manager.last_name} {data.manager.first_name}
                    </span>
                    <span className="text-xs text-muted-foreground">Директор магазина</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-2" asChild>
                  <Link href={`${ADMIN_ROUTES.employees}?store_id=${storeId}`}>
                    <Phone className="size-3.5" />
                    {t("overview.manager_contact")}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Alert variant="default" className="border-warning/40 bg-warning/5 py-3">
                  <AlertCircle className="size-4 text-warning" />
                  <AlertDescription className="text-xs text-warning">
                    {t("hero.manager_unassigned")}
                  </AlertDescription>
                </Alert>
                <Button size="sm" variant="outline" className="w-full">
                  {t("hero.manager_assign")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("overview.contacts_card")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{t("overview.contacts_phone")}:</span>
                <span className="text-foreground font-medium">+7 (382) 222-30-55</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{t("overview.contacts_email")}:</span>
                <span className="text-foreground font-medium truncate">spar-tom-001@spar.ru</span>
              </div>
              <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border">
                <Clock className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{t("overview.contacts_hours")}:</span>
                <span className="text-foreground font-medium">08:00 – 22:00</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("overview.address_card")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-sm text-foreground leading-relaxed">{data.address_full}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="w-full gap-2 justify-start h-8"
                onClick={onCopyAddress}
              >
                {addressCopied ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span className="text-xs">{addressCopied ? t("overview.address_copied") : t("overview.address_copy")}</span>
              </Button>
              {data.geo && (
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">{t("overview.coords")}: </span>
                  <span className="font-mono">{data.geo.lat}, {data.geo.lng}</span>
                </div>
              )}
              {/* Map placeholder */}
              <div className="relative rounded-lg overflow-hidden bg-muted h-28 flex items-center justify-center mt-1">
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/80" />
                <div className="relative flex flex-col items-center gap-1 text-muted-foreground">
                  <MapPin className="size-6" />
                  <span className="text-xs">Томск, пр. Ленина 80</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
