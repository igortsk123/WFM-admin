"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Lightbulb,
  Target,
  ClipboardList,
  BarChart2,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b bg-info/5 px-4">
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <span className="truncate text-sm font-medium">{labelText}</span>
        {link && (
          <Link
            href={link}
            className="hidden shrink-0 text-xs text-primary hover:underline md:inline"
          >
            {t("open_link")}
          </Link>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
