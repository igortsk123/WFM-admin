import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { StoreDetail } from "@/components/features/stores/store-detail"

interface PageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function StoreDetailPage({ params }: PageProps) {
  const { id } = await params
  const numericId = Number(id)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    notFound()
  }

  return (
    <Suspense fallback={<StoreDetailSkeleton />}>
      <StoreDetail storeId={numericId} />
    </Suspense>
  )
}

function StoreDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
