"use client";

import { useTranslations } from "next-intl";
import {
  Lightbulb,
  Target,
  ClipboardList,
  BarChart2,
  MessageSquare,
} from "lucide-react";

import { InformationBanner } from "@/components/shared";
import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { AIChatContextType } from "@/lib/types";

interface ContextBannerProps {
  contextType: AIChatContextType;
  contextId?: string | null;
  contextTitle?: string;
  onClose?: () => void;
}

const CONTEXT_ICONS: Record<AIChatContextType, React.ElementType> = {
  general: MessageSquare,
  suggestion: Lightbulb,
  goal: Target,
  task: ClipboardList,
  chart: BarChart2,
};

function getContextLink(
  contextType: AIChatContextType,
  contextId?: string | null
): string | null {
  if (!contextId) return null;
  switch (contextType) {
    case "suggestion":
      return ADMIN_ROUTES.aiSuggestionDetail(contextId);
    case "goal":
      return ADMIN_ROUTES.goalDetail(contextId);
    case "task":
      return ADMIN_ROUTES.taskDetail(contextId);
    case "chart":
      return ADMIN_ROUTES.reportsKpi; // Charts don't have a detail route; link to reports
    default:
      return null;
  }
}

export function ContextBanner({
  contextType,
  contextId,
  contextTitle,
  onClose,
}: ContextBannerProps) {
  const t = useTranslations("screen.aiChat.context_banner");
  const Icon = CONTEXT_ICONS[contextType];
  const link = getContextLink(contextType, contextId);

  // Build the label text
  let labelText: string;
  if (contextType === "general") {
    labelText = t("general");
  } else if (contextType === "task" && contextId) {
    labelText = t("task", { id: contextId.slice(0, 8), title: contextTitle || "" });
  } else {
    labelText = t(contextType, { title: contextTitle || "" });
  }

  const showCloseButton = contextType !== "general" && onClose;

  return (
    <InformationBanner
      variant="info"
      layout="sticky"
      icon={<Icon className="size-4" />}
      title={labelText}
      action={
        link ? (
          <Link
            href={link}
            className="hidden shrink-0 text-xs text-primary hover:underline md:inline"
          >
            {t("open_link")}
          </Link>
        ) : undefined
      }
      onClose={showCloseButton ? onClose : undefined}
      closeLabel={t("close")}
    />
  );
}
