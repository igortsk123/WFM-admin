"use client";

import { BoxSelect, ClipboardList } from "lucide-react";

import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { OBJECT_FORMATS, type TFn } from "./_shared";

interface ToolbarProps {
  tab: string | null;
  onTabChange: (value: string) => void;
  filterFormat: string | null;
  onFilterFormatChange: (value: string) => void;
  filterWorkType: string | null;
  onFilterWorkTypeChange: (value: string) => void;
  t: TFn;
  tFreelance: TFn;
}

export function ServiceNormsToolbar({
  tab,
  onTabChange,
  filterFormat,
  onFilterFormatChange,
  filterWorkType,
  onFilterWorkTypeChange,
  t,
  tFreelance,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <Tabs
        value={tab ?? "active"}
        onValueChange={onTabChange}
        className="w-full sm:w-auto"
      >
        <TabsList className="h-9">
          <TabsTrigger value="active" className="text-sm px-4">
            {t("tabs.active")}
          </TabsTrigger>
          <TabsTrigger value="archive" className="text-sm px-4">
            {t("tabs.archive")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={filterFormat ?? ""}
          onValueChange={(v) => onFilterFormatChange(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[160px] text-sm">
            <BoxSelect className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder={t("filters.all_formats")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("filters.all_formats")}</SelectItem>
            {OBJECT_FORMATS.map((fmt) => (
              <SelectItem key={fmt} value={fmt}>
                {tFreelance(`object_format.${fmt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterWorkType ?? ""}
          onValueChange={(v) => onFilterWorkTypeChange(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[160px] text-sm">
            <ClipboardList className="size-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder={t("filters.all_work_types")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("filters.all_work_types")}</SelectItem>
            {MOCK_WORK_TYPES.map((wt) => (
              <SelectItem key={wt.id} value={String(wt.id)}>
                {wt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
