import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AISuggestionsInbox } from "@/components/features/ai/suggestions-inbox";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.aiSuggestions");
  return { title: t("page_title") };
}

function SuggestionsInboxSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export default function AISuggestionsPage() {
  return (
    <Suspense fallback={<SuggestionsInboxSkeleton />}>
      <AISuggestionsInbox />
    </Suspense>
  );
}
