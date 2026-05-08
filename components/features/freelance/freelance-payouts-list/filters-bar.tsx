"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SingleSelectCombobox } from "@/components/shared/single-select-combobox";
import { DateRangePicker } from "@/components/shared/date-range-picker";

import type { Filters, TabStatus } from "./_shared";

interface FiltersBarProps {
  activeTab: TabStatus;
  onTabChange: (tab: TabStatus) => void;
  tabCounts: Record<TabStatus, number>;
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  freelancerOptions: { value: string; label: string }[];
  agentOptions: { value: string; label: string }[];
}

const toIsoDate = (d: Date | undefined) => {
  if (!d) return "";
  // local-aware ISO date (yyyy-mm-dd)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromIsoDate = (s: string): Date | undefined =>
  s ? new Date(s) : undefined;

export function FiltersBar({
  activeTab,
  onTabChange,
  tabCounts,
  filters,
  onFiltersChange,
  freelancerOptions,
  agentOptions,
}: FiltersBarProps) {
  const t = useTranslations("screen.freelancePayoutsList");

  return (
    <div className="space-y-4">
      {/* Desktop tabs */}
      <div className="hidden md:block">
        <Tabs
          value={activeTab}
          onValueChange={(v) => onTabChange(v as TabStatus)}
        >
          <TabsList>
            <TabsTrigger value="PENDING">
              {t("tabs.pending")}
              {tabCounts.PENDING > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 size-5 p-0 flex items-center justify-center text-xs"
                >
                  {tabCounts.PENDING}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="PROCESSING">
              {t("tabs.processing")}
              {tabCounts.PROCESSING > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 size-5 p-0 flex items-center justify-center text-xs"
                >
                  {tabCounts.PROCESSING}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="PAID">
              {t("tabs.paid")}
              {tabCounts.PAID > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 size-5 p-0 flex items-center justify-center text-xs"
                >
                  {tabCounts.PAID}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="FAILED"
              className="data-[state=active]:text-destructive"
            >
              {t("tabs.failed")}
              {tabCounts.FAILED > 0 && (
                <Badge className="ml-1.5 size-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                  {tabCounts.FAILED}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mobile tab select */}
      <div className="md:hidden">
        <Select
          value={activeTab}
          onValueChange={(v) => onTabChange(v as TabStatus)}
        >
          <SelectTrigger className="w-full min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">
              {t("tabs.pending")} ({tabCounts.PENDING})
            </SelectItem>
            <SelectItem value="PROCESSING">
              {t("tabs.processing")} ({tabCounts.PROCESSING})
            </SelectItem>
            <SelectItem value="PAID">
              {t("tabs.paid")} ({tabCounts.PAID})
            </SelectItem>
            <SelectItem value="FAILED">
              {t("tabs.failed")} ({tabCounts.FAILED})
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <SingleSelectCombobox
          options={freelancerOptions}
          value={filters.freelancerId}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, freelancerId: v })
          }
          placeholder={t("filters.freelancer_placeholder")}
          searchPlaceholder={t("filters.freelancer")}
          className="w-full sm:w-48"
        />
        <SingleSelectCombobox
          options={agentOptions}
          value={filters.agentId}
          onValueChange={(v) => onFiltersChange({ ...filters, agentId: v })}
          placeholder={t("filters.agent_placeholder")}
          searchPlaceholder={t("filters.agent")}
          className="w-full sm:w-44"
        />
        <DateRangePicker
          from={fromIsoDate(filters.dateFrom)}
          to={fromIsoDate(filters.dateTo)}
          onChange={(from, to) =>
            onFiltersChange({
              ...filters,
              dateFrom: toIsoDate(from),
              dateTo: toIsoDate(to),
            })
          }
          placeholder={t("filters.date_range")}
          disableFuture={false}
        />
      </div>
    </div>
  );
}
