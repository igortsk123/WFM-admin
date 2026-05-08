"use client"

import { useTranslations, useLocale } from "next-intl"
import { ArrowRight } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { formatMinutesAgo, type ReviewQueueItem } from "./_shared"

export function ReviewQueueCard({ items }: { items: ReviewQueueItem[] }) {
  const t = useTranslations("screen.dashboard.review_queue")
  const locale = useLocale()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 5).map((item) => {
          const minutesAgo = Math.floor((Date.now() - item.submittedAt.getTime()) / 60000)
          return (
            <Link
              key={item.id}
              href={ADMIN_ROUTES.taskDetail(item.id)}
              className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.assignee} · {formatMinutesAgo(minutesAgo, locale)}</p>
              </div>
              {item.overdueMinutes && (
                <Badge variant="outline" className="shrink-0 ml-2 text-destructive border-destructive/30">
                  +{item.overdueMinutes} мин
                </Badge>
              )}
            </Link>
          )
        })}
        <Button variant="outline" className="w-full" asChild>
          <Link href={ADMIN_ROUTES.tasksReview}>
            {t("open_queue")}
            <ArrowRight className="size-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
