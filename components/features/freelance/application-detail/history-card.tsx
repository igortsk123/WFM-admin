"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { RoleBadge } from "@/components/shared";
import { formatRelative } from "@/lib/utils/format";
import { pickLocalized } from "@/lib/utils/locale-pick";
import type { Locale } from "@/lib/types";

import type { ApplicationDetailData } from "./types";

export function HistoryCard({ app }: { app: ApplicationDetailData }) {
  const tHistory = useTranslations("screen.freelanceApplicationDetail.history_card");
  const locale = useLocale();
  const [historyExpanded, setHistoryExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-0">
        <button
          type="button"
          className="flex items-center justify-between w-full text-left"
          onClick={() => setHistoryExpanded((p) => !p)}
        >
          <CardTitle className="text-sm">{tHistory("title")}</CardTitle>
          {historyExpanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {historyExpanded && (
        <CardContent className="pt-3">
          {app.history.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              История пуста
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {app.history.map((evt, i) => {
                const actionKey = `action_${evt.action}` as Parameters<typeof tHistory>[0];
                return (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-2 rounded-full bg-primary mt-1 shrink-0" />
                      {i < app.history.length - 1 && (
                        <div className="w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 pb-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {evt.actor_name}
                        </span>
                        {i === 0 && (
                          <RoleBadge
                            role={app.created_by_role}
                            size="sm"
                          />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(
                            new Date(evt.occurred_at),
                            locale as "ru" | "en"
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {tHistory(actionKey)}
                      </span>
                      {evt.comment && (
                        <p className="text-xs text-foreground bg-muted/40 rounded px-2 py-1 mt-0.5">
                          {pickLocalized(evt.comment, evt.comment_en, locale as Locale)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      )}
    </Card>
  );
}
