import { Skeleton } from "@/components/ui/skeleton";

export function NotificationSkeleton() {
  return (
    <div className="flex gap-4 p-4 border-b border-border last:border-0">
      <Skeleton className="size-8 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}
