"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ZonesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-lg" />
      ))}
    </div>
  );
}
