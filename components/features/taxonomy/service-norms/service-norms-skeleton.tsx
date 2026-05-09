import { Skeleton } from "@/components/ui/skeleton";

export function ServiceNormsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-[360px] w-full rounded-lg" />
    </div>
  );
}
