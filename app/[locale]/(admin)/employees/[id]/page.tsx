import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { EmployeeDetail } from "@/components/features/employees/employee-detail"

interface PageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    notFound()
  }

  return (
    <Suspense fallback={<EmployeeDetailSkeleton />}>
      <EmployeeDetail userId={numericId} />
    </Suspense>
  )
}

function EmployeeDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
