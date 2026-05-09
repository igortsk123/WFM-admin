"use client"

import { CardGridSkeleton } from "@/components/shared/card-grid-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export function WorkTypesListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-44" />
        </div>
      </div>
      <CardGridSkeleton count={3} columns={3} height="h-24" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  )
}
