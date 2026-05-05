import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftDetail } from "@/components/features/schedule/shift-detail";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations("screen.shiftDetail");
  const { id } = await params;
  return { title: `${t("page_title")} #${id}` };
}

function ShiftDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function ShiftDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    notFound();
  }

  return (
    <Suspense fallback={<ShiftDetailSkeleton />}>
      <ShiftDetail shiftId={numericId} />
    </Suspense>
  );
}
