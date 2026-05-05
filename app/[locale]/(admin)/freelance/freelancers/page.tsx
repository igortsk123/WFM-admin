import { Suspense } from "react"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Skeleton } from "@/components/ui/skeleton"
import { FreelancersList } from "@/components/features/freelance/freelancers-list"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.freelancers")
  return { title: t("page_title") }
}

function FreelancersListSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-screen-2xl mx-auto">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function FreelancersListPage() {
  return (
    <Suspense fallback={<FreelancersListSkeleton />}>
      <FreelancersList />
    </Suspense>
  )
}
