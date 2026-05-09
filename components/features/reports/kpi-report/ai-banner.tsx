import type { useTranslations } from "next-intl";
import { Sparkles, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InformationBanner } from "@/components/shared";
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
    <InformationBanner
      variant="info"
      layout="card"
      ariaLabel="AI аналитика"
      role="complementary"
      icon={<Sparkles className="size-4" />}
      description={t("ai_banner.text")}
      onClose={onClose}
      closeLabel="Закрыть"
      action={
        <>
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
        </>
      }
    />
  );
}
