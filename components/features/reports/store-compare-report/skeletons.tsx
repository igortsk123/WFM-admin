import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "200px repeat(6, 1fr)" }}>
      {Array.from({ length: 9 * 7 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded" />
      ))}
    </div>
  );
}

export function ScatterSkeleton() {
  return <Skeleton className="h-[500px] w-full rounded-xl" />;
}
