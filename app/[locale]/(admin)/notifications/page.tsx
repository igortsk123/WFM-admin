import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NotificationsCenter } from "@/components/features/notifications/notifications-center";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.notifications");
  return { title: t("page_title") };
}

export default function NotificationsPage() {
  return <NotificationsCenter />;
}
