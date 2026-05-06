import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { OfferDetail } from "@/components/features/freelance/offer-detail"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OfferDetailPage({ params }: PageProps) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 space-y-4 max-w-screen-xl mx-auto">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <OfferDetail offerId={id} />
    </Suspense>
  )
}
