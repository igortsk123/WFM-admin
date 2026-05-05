import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { StoresList } from "@/components/features/stores/stores-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.stores");
  return {
    title: t("page_title"),
  };
}

function StoresListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function StoresPage() {
  return (
    <Suspense fallback={<StoresListSkeleton />}>
      <StoresList />
    </Suspense>
  );
}
