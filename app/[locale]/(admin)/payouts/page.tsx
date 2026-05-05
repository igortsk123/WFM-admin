import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PayoutsList } from "@/components/features/payouts/payouts-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.payouts");
  return { title: t("page_title") };
}

function PayoutsListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={<PayoutsListSkeleton />}>
      <PayoutsList />
    </Suspense>
  );
}
