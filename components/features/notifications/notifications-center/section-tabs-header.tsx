import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabBadgeProps {
  count: number;
}

function TabBadge({ count }: TabBadgeProps) {
  if (count <= 0) return null;
  return (
    <Badge
      variant="secondary"
      className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold bg-primary/10 text-primary border-primary/20"
    >
      {count}
    </Badge>
  );
}

interface SectionTabsHeaderProps {
  total: number;
  unreadCount: number;
  aiUnreadCount: number;
  archivedCount: number;
}

export function SectionTabsHeader({
  total,
  unreadCount,
  aiUnreadCount,
  archivedCount,
}: SectionTabsHeaderProps) {
  const t = useTranslations("screen.notifications");

  return (
    <div className="overflow-x-auto scrollbar-none">
      <TabsList className="w-max min-w-full md:w-auto h-10">
        <TabsTrigger value="all" className="text-sm">
          {t("tabs.all")}
          <span className="ml-1 text-xs text-muted-foreground">({total})</span>
        </TabsTrigger>
        <TabsTrigger value="unread" className="text-sm">
          {t("tabs.unread")}
          <TabBadge count={unreadCount} />
        </TabsTrigger>
        <TabsTrigger value="ai" className="text-sm flex items-center gap-1">
          <Sparkles className="size-3.5" />
          ИИ-предложения
          <TabBadge count={aiUnreadCount} />
        </TabsTrigger>
        <TabsTrigger value="archived" className="text-sm">
          {t("tabs.archived")}
          <span className="ml-1 text-xs text-muted-foreground">
            ({archivedCount})
          </span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
