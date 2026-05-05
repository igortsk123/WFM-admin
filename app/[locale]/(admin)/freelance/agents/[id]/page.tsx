import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentDetail } from "@/components/features/freelance/agent-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.freelanceAgentDetail");
  return { title: t("page_title") };
}

function AgentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<AgentDetailSkeleton />}>
      <AgentDetail id={id} />
    </Suspense>
  );
}
