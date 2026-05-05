import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AIChatScreen } from "@/components/features/ai/chat-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.aiChat");
  return { title: t("page_title") };
}

function ChatScreenSkeleton() {
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-7rem)]">
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <div className="space-y-3 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-3/4" />
          ))}
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={<ChatScreenSkeleton />}>
      <AIChatScreen />
    </Suspense>
  );
}
