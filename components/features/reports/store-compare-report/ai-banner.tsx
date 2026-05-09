"use client";

import { Sparkles, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InformationBanner } from "@/components/shared";
import { useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import type { T } from "./_shared";

interface AiBannerProps {
  t: T;
  onClose: () => void;
}

export function AiBanner({ t, onClose }: AiBannerProps) {
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
                `${ADMIN_ROUTES.aiSuggestions}?store_id=Food-City-Tomsk-001` as never
              )
            }
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t("ai_banner.suggestions_btn")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              router.push(
                `${ADMIN_ROUTES.aiChat}?context_type=chart&context_id=stores-compare` as never
              )
            }
          >
            <MessageSquare className="size-3.5" aria-hidden="true" />
            {t("ai_banner.ask_btn")}
          </Button>
        </>
      }
    />
  );
}
