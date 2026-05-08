"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Inbox } from "lucide-react";

import {
  ActivityFeed,
  type ActivityItem,
  type ActivityType,
} from "@/components/shared/activity-feed";
import { EmptyState } from "@/components/shared/empty-state";

import type { AgentWithRoster } from "./_shared";

interface HistoryTabProps {
  agent: AgentWithRoster;
  t: ReturnType<typeof useTranslations>;
}

export function HistoryTab({ agent, t }: HistoryTabProps) {
  // Generate mock history from agent data
  const items: ActivityItem[] = React.useMemo(() => {
    const entries: ActivityItem[] = [
      {
        id: `${agent.id}-created`,
        timestamp: agent.created_at,
        actor: "Соколова А. В.",
        action: t("history_tab.created"),
        type: "EMPLOYEE" as ActivityType,
      },
    ];
    if (agent.contract_signed_at) {
      entries.push({
        id: `${agent.id}-contract`,
        timestamp: agent.contract_signed_at + "T12:00:00Z",
        actor: "Соколова А. В.",
        action: t("history_tab.updated"),
        type: "SYSTEM" as ActivityType,
      });
    }
    if (agent.status === "BLOCKED") {
      entries.push({
        id: `${agent.id}-blocked`,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "Иванов П. С.",
        action: t("history_tab.blocked"),
        type: "TASK_BLOCKED" as ActivityType,
      });
    }
    if (agent.status === "ARCHIVED") {
      entries.push({
        id: `${agent.id}-archived`,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "Соколова А. В.",
        action: t("history_tab.archived"),
        type: "TASK_ARCHIVED" as ActivityType,
      });
    }
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [agent, t]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Нет записей"
        description="История изменений появится здесь"
      />
    );
  }

  return <ActivityFeed items={items} className="mt-2" />;
}
