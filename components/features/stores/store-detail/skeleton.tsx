import { Skeleton } from "@/components/ui/skeleton"

export function StoreDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-96 rounded-lg" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}
