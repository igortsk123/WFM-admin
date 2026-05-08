import { Skeleton } from "@/components/ui/skeleton";

export function PlanFactSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Загрузка отчёта">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-[400px] rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
