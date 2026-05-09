import { Skeleton } from "@/components/ui/skeleton";

export function PayoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full max-w-2xl" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
