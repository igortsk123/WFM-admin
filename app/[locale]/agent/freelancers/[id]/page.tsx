import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentFreelancerDetail } from "@/components/features/agent-cabinet/agent-freelancer-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("screen.agentFreelancers.detail");
  return { title: `${t("page_title")} #${id}` };
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default async function AgentFreelancerDetailPage({ params }: Props) {
  const { id } = await params;
  const freelancerId = parseInt(id, 10);

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AgentFreelancerDetail freelancerId={freelancerId} />
    </Suspense>
  );
}
