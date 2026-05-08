"use client"

import { List, Tag, FileText } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StatsRowProps {
  totalAll: number
  groupCount: number
  withoutHints: number
  isLoading: boolean
}

export function StatsRow({
  totalAll,
  groupCount,
  withoutHints,
  isLoading,
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="rounded-xl">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-muted">
            <List className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Всего типов
            </p>
            <p className="text-2xl font-semibold tracking-tight">
              {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : totalAll}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-muted">
            <Tag className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Категорий
            </p>
            <p className="text-2xl font-semibold tracking-tight">
              {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : groupCount}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-muted">
            <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Без подсказок
            </p>
            <p
              className={cn(
                "text-2xl font-semibold tracking-tight",
                withoutHints > 0 && "text-warning"
              )}
            >
              {isLoading ? <Skeleton className="h-7 w-8 inline-block" /> : withoutHints}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
