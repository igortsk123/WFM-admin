"use client";

import { CardGridSkeleton } from "@/components/shared/card-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function EarningsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <CardGridSkeleton count={4} columns={4} height="h-28" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
