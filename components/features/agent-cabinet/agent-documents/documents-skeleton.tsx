import { Skeleton } from "@/components/ui/skeleton";

export function DocumentsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 flex gap-4 items-start">
          <Skeleton className="size-10 rounded-md shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}
