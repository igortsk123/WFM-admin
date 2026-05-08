"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import { EmptyState } from "@/components/shared/empty-state";

import { MOCK_HISTORY, type HistoryEntry } from "./_shared";

export function HistoryTab() {
  const t = useTranslations("screen.riskRules");
  const [diffEntry, setDiffEntry] = useState<HistoryEntry | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  const entries = MOCK_HISTORY;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("history_tab.title")}
        description={t("history_tab.empty")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h3 className="text-sm font-semibold text-foreground">{t("history_tab.title")}</h3>

      <div className="flex flex-col gap-0 rounded-lg border overflow-hidden">
        {entries.map((entry, idx) => (
          <button
            key={entry.id}
            onClick={() => {
              setDiffEntry(entry);
              setDiffOpen(true);
            }}
            className={`flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors ${idx > 0 ? "border-t" : ""}`}
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground">
                {entry.work_type_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.changed_by} · {new Date(entry.changed_at).toLocaleString("ru-RU")}
              </span>
            </div>
            <span className="text-xs text-primary font-medium shrink-0">Детали →</span>
          </button>
        ))}
      </div>

      {/* Diff drawer */}
      <Sheet open={diffOpen} onOpenChange={setDiffOpen}>
        <SheetContent side="right" className="w-full max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>{t("history_tab.diff_drawer_title")}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            {diffEntry && (
              <div className="px-6 py-5 flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {diffEntry.work_type_name} · {new Date(diffEntry.changed_at).toLocaleString("ru-RU")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-3 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                      {t("history_tab.before")}
                    </span>
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                      {JSON.stringify(diffEntry.before, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-lg border bg-success/5 border-success/20 p-3 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-success uppercase tracking-wide">
                      {t("history_tab.after")}
                    </span>
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                      {JSON.stringify(diffEntry.after, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
