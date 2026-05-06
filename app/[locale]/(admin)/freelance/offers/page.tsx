import { Suspense } from "react"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Skeleton } from "@/components/ui/skeleton"
import { OffersList } from "@/components/features/freelance/offers-list"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.offers")
  return { title: t("page_title") }
}

export default function OffersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 space-y-4 max-w-screen-xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <OffersList />
    </Suspense>
  )
}
