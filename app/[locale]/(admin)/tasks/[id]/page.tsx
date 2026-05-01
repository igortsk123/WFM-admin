import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { TaskDetail } from "@/components/features/tasks/task-detail"

interface PageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-80" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
            <div className="flex flex-col gap-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>
        </div>
      }
    >
      <TaskDetail taskId={id} />
    </Suspense>
  )
}
