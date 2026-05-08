import type { useTranslations } from "next-intl";
import { Sparkles, MessageSquare, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

interface AiBannerProps {
  storeId: string;
  t: ReturnType<typeof useTranslations>;
  onClose: () => void;
}

export function AiBanner({ storeId, t, onClose }: AiBannerProps) {
  const router = useRouter();
  return (
    <div
      role="complementary"
      aria-label="AI аналитика"
      className="rounded-lg border border-info/30 bg-info/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <Sparkles className="size-4 text-info shrink-0 mt-0.5 hidden sm:block" />
      <p className="flex-1 text-sm text-foreground leading-relaxed">
        {t("ai_banner.text")}
      </p>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() =>
            router.push(
              `${ADMIN_ROUTES.aiSuggestions}${storeId ? `?store_id=${storeId}` : ""}` as never
            )
          }
        >
          <Sparkles className="size-3.5" />
          {t("ai_banner.suggestions_btn")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            router.push(
              `${ADMIN_ROUTES.aiChat}?context_type=chart&context_id=kpi-overview` as never
            )
          }
        >
          <MessageSquare className="size-3.5" />
          {t("ai_banner.ask_btn")}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
