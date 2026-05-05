import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PayoutDetail } from "@/components/features/payouts/payout-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.payoutDetail");
  return { title: t("page_title") };
}

function PayoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full max-w-2xl" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<PayoutDetailSkeleton />}>
      <PayoutDetail id={id} />
    </Suspense>
  );
}
