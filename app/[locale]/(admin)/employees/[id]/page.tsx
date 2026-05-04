import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeDetail } from "@/components/features/employees/employee-detail";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations("screen.employeeDetail");
  const { id } = await params;
  return {
    title: `#${id} — ${t("breadcrumb_employees")}`,
  };
}

function EmployeeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    notFound();
  }

  return (
    <Suspense fallback={<EmployeeDetailSkeleton />}>
      <EmployeeDetail userId={numericId} />
    </Suspense>
  );
}
