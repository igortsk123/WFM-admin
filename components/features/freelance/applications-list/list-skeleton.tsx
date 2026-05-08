import { Skeleton } from "@/components/ui/skeleton"

export function ListSkeleton() {
  return (
    <div className="space-y-2 mt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}
