"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { cn } from "@/lib/utils";
import type { Store, Zone, WorkType, AcceptancePolicy } from "@/lib/types";

import type { TaskTemplate } from "./_shared";

// ─── Templates Card ─────────────────────────────────────────────────

interface TemplatesCardProps {
  templates: TaskTemplate[];
  applyTemplate: (tpl: TaskTemplate) => void;
}

export function TaskFormTemplatesCard({ templates, applyTemplate }: TemplatesCardProps) {
  const t = useTranslations("screen.taskForm");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("sidebar_templates")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {templates.map((tpl) => (
          <button
            key={tpl.key}
            type="button"
            onClick={() => applyTemplate(tpl)}
            className="w-full text-left text-sm text-primary hover:underline py-1 block"
          >
            {t(`template_${tpl.key}` as Parameters<typeof t>[0])}
          </button>
        ))}
        <p className="text-xs text-muted-foreground pt-1">{t("templates_hint")}</p>
      </CardContent>
    </Card>
  );
}

// ─── Summary sidebar ────────────────────────────────────────────────

export interface SummarySidebarProps {
  selectedStore?: Store;
  selectedZone?: Zone;
  selectedWorkType?: WorkType;
  summaryAssignee: string;
  watchedPlannedMinutes?: number;
  watchedScheduledDate?: Date;
  watchedScheduledTime?: string;
  watchedDueDate?: Date;
  watchedDueTime?: string;
  watchedPolicy?: AcceptancePolicy;
  watchedPhoto?: boolean;
}

function useSummaryRows(props: SummarySidebarProps) {
  const t = useTranslations("screen.taskForm");
  const notSet = t("summary_not_set");

  const formatDt = (date?: Date, time?: string) => {
    if (!date) return notSet;
    const d = format(date, "d MMM", { locale: ru });
    return time ? `${d} ${time}` : d;
  };

  const rows: { label: string; value: string }[] = [
    { label: t("summary_store"), value: props.selectedStore?.name ?? notSet },
    { label: t("summary_zone"), value: props.selectedZone?.name ?? notSet },
    { label: t("summary_work_type"), value: props.selectedWorkType?.name ?? notSet },
    { label: t("summary_assignee"), value: props.summaryAssignee },
    {
      label: t("summary_plan"),
      value: props.watchedPlannedMinutes
        ? t("summary_minutes", { min: props.watchedPlannedMinutes })
        : notSet,
    },
    {
      label: t("summary_scheduled"),
      value: formatDt(props.watchedScheduledDate, props.watchedScheduledTime),
    },
    {
      label: t("summary_due"),
      value: formatDt(props.watchedDueDate, props.watchedDueTime),
    },
    {
      label: t("summary_policy"),
      value:
        props.watchedPolicy === "AUTO"
          ? t("policy_auto")
          : props.watchedPolicy === "MANUAL"
          ? t("policy_manual")
          : notSet,
    },
    {
      label: t("summary_photo"),
      value: props.watchedPhoto ? t("summary_photo_yes") : t("summary_photo_no"),
    },
  ];

  return rows;
}

export function TaskFormSummarySidebar(props: SummarySidebarProps) {
  const t = useTranslations("screen.taskForm");
  const rows = useSummaryRows(props);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("sidebar_summary")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-2 text-sm">
              <dt className="text-muted-foreground shrink-0">{row.label}</dt>
              <dd className="text-foreground text-right truncate max-w-[140px]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function TaskFormMobileSummarySidebar(props: SummarySidebarProps) {
  const t = useTranslations("screen.taskForm");
  const [open, setOpen] = useState(false);
  const rows = useSummaryRows(props);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
          >
            {t("sidebar_summary")}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-border">
            <dl className="space-y-2 pt-3">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-2 text-sm">
                  <dt className="text-muted-foreground shrink-0">{row.label}</dt>
                  <dd className="text-foreground text-right truncate max-w-[160px]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
