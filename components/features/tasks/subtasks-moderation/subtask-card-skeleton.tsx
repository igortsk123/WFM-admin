"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function SubtaskCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  )
}
