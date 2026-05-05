"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Plus,
  MoreVertical,
  Lightbulb,
  Target,
  ClipboardList,
  BarChart2,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/utils/format";
import type { AIChatThread, AIChatContextType, Locale } from "@/lib/types";

interface ChatThreadListProps {
  threads: AIChatThread[];
  activeThreadId?: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onArchiveThread?: (threadId: string) => void;
  onRenameThread?: (threadId: string) => void;
}

type FilterType = "all" | AIChatContextType;

const CONTEXT_ICONS: Record<AIChatContextType, React.ElementType> = {
  general: MessageSquare,
  suggestion: Lightbulb,
  goal: Target,
  task: ClipboardList,
  chart: BarChart2,
};

export function ChatThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onArchiveThread,
  onRenameThread,
}: ChatThreadListProps) {
  const t = useTranslations("screen.aiChat.threads");
  const locale = useLocale() as Locale;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Filter and search threads
  const filteredThreads = useMemo(() => {
    let result = threads;

    // Filter by context type
    if (filterType !== "all") {
      result = result.filter((th) => th.context_type === filterType);
    }

    // Search by title
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (th) => th.title?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [threads, filterType, searchQuery]);

  // Calculate footer stats
  const totalThreads = threads.length;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekCount = threads.filter(
    (th) => new Date(th.created_at) > weekAgo
  ).length;

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: t("filters.all") },
    { key: "task", label: t("filters.tasks") },
    { key: "goal", label: t("filters.goals") },
    { key: "chart", label: t("filters.charts") },
    { key: "general", label: t("filters.general") },
  ];

  return (
    <div className="flex h-full flex-col border-r bg-muted/30">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-3">
        <Button
          onClick={onNewChat}
          className="w-full gap-2"
          size="sm"
        >
          <Plus className="size-4" />
          {t("new_chat")}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterType(f.key)}
            className={cn(
              "inline-flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors",
              filterType === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {filteredThreads.map((thread) => {
            const Icon = CONTEXT_ICONS[thread.context_type];
            const isActive = thread.id === activeThreadId;
            const isRecent =
              new Date().getTime() - new Date(thread.last_message_at).getTime() <
              1000 * 60 * 60; // within last hour

            return (
              <div
                key={thread.id}
                className={cn(
                  "group relative flex cursor-pointer items-start gap-2 rounded-md p-2 transition-colors hover:bg-accent",
                  isActive && "border-l-2 border-primary bg-accent"
                )}
                onClick={() => onSelectThread(thread.id)}
              >
                {/* Context icon */}
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background">
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-2 text-sm font-medium">
                      {thread.title || t("context_label.general")}
                    </p>
                    {isRecent && !isActive && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {t(`context_label.${thread.context_type}`)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(new Date(thread.last_message_at), locale)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameThread?.(thread.id);
                      }}
                    >
                      {t("row_actions.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveThread?.(thread.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      {t("row_actions.archive")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {filteredThreads.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? "No chats found" : "No chats yet"}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3">
        <p className="text-xs text-muted-foreground">
          {t("footer_count", { total: totalThreads, week: thisWeekCount })}
        </p>
      </div>
    </div>
  );
}
