import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AiCoachEditor } from "@/components/features/ai-coach/ai-coach-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.aiCoach");
  return { title: t("page_title") };
}

function AiCoachEditorSkeleton() {
  return (
    <div className="grid lg:grid-cols-[20rem_1fr] gap-6 h-[calc(100vh-9rem)]">
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export default function AiCoachPage() {
  return (
    <Suspense fallback={<AiCoachEditorSkeleton />}>
      <AiCoachEditor />
    </Suspense>
  );
}
