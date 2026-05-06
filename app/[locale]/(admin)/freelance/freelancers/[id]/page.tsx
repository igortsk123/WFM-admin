import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { FreelancerDetail } from "@/components/features/freelance/freelancer-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FreelancerDetailPage({ params }: PageProps) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (Number.isNaN(numericId)) notFound()

  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 space-y-4 max-w-screen-xl mx-auto">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <FreelancerDetail freelancerId={numericId} />
    </Suspense>
  )
}
