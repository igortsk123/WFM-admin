import { Suspense } from "react"
import { TasksList } from "@/components/features/tasks/tasks-list"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Tasks list page — Server Component wrapper.
 * URL state (tab, page, filters) is read by TasksList via useSearchParams().
 */
export default function TasksPage() {
  return (
    <Suspense fallback={<TasksListSkeleton />}>
      <TasksList />
    </Suspense>
  )
}

function TasksListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <Skeleton className="h-9 w-full max-w-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}
