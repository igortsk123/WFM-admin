import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsList } from "@/components/features/notifications/notifications-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.notifications");
  return { title: t("page_title") };
}

function NotificationsListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsListSkeleton />}>
      <NotificationsList />
    </Suspense>
  );
}
