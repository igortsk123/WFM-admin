import type { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

export function ChartAiButton({
  chartId,
  t,
}: {
  chartId: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() =>
              router.push(
                `${ADMIN_ROUTES.aiChat}?context_type=chart&context_id=${chartId}` as never
              )
            }
            aria-label={t("ai_chart_tooltip")}
          >
            <Sparkles className="size-3.5 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{t("ai_chart_tooltip")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("ask_in_chat")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
