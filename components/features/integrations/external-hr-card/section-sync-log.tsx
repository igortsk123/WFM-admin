"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import type { ExternalHrSyncLog } from "@/lib/types";

import type { Translator } from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// SYNC LOG TABLE
// ═══════════════════════════════════════════════════════════════════

export function SyncLogTable({
  logs,
  loading,
  locale,
  onTrigger,
  t,
}: {
  logs: ExternalHrSyncLog[];
  loading: boolean;
  locale: Locale;
  onTrigger: () => void;
  t: Translator;
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top action */}
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-2 min-h-[44px]"
          onClick={onTrigger}
        >
          <RefreshCw className="size-3.5" />
          {t("sheet.trigger_sync")}
        </Button>
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("sheet.log_no_data")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">{t("sheet.log_col_datetime")}</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">{t("sheet.log_col_trigger")}</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">{t("sheet.log_col_received")}</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">{t("sheet.log_col_created")}</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">{t("sheet.log_col_errors")}</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground text-xs">{t("sheet.log_col_status")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isOk = log.errors_count === 0;
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={cn(
                        "border-b transition-colors",
                        !isOk ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"
                      )}
                    >
                      <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatDateTime(new Date(log.occurred_at), locale)}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {log.triggered_by === "MANUAL"
                          ? t("sheet.log_trigger_manual")
                          : t("sheet.log_trigger_schedule")}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                        {log.applications_received}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                        {log.freelancers_created}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        {log.errors_count > 0 ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-destructive hover:underline"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          >
                            {log.errors_count}
                            {isExpanded ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            isOk
                              ? "text-success border-success/30 bg-success/5"
                              : "text-destructive border-destructive/30 bg-destructive/5"
                          )}
                        >
                          {isOk ? t("sheet.log_status_ok") : t("sheet.log_status_errors")}
                        </Badge>
                      </td>
                    </tr>
                    {isExpanded && log.errors && log.errors.length > 0 && (
                      <tr className="border-b bg-destructive/5">
                        <td colSpan={6} className="px-3 py-2.5">
                          <div className="space-y-1">
                            {log.errors.map((err, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-xs text-destructive"
                              >
                                <span className="font-mono shrink-0">{err.external_ref}</span>
                                <span>—</span>
                                <span>{err.error}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
