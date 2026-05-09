import type { Dispatch, SetStateAction } from "react";
import type { useTranslations } from "next-intl";
import { Download, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LazyCalendar as Calendar } from "@/components/shared/lazy-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { ReportPeriod } from "@/lib/api/reports";

export function PlanFactToolbar({
  t,
  period,
  setPeriod,
  storeId,
  setStoreId,
  storeOptions,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  fromPickerOpen,
  setFromPickerOpen,
  toPickerOpen,
  setToPickerOpen,
  isStoreLocked,
  onExport,
  isExporting,
}: {
  t: ReturnType<typeof useTranslations>;
  period: ReportPeriod;
  setPeriod: Dispatch<SetStateAction<ReportPeriod>>;
  storeId: string;
  setStoreId: Dispatch<SetStateAction<string>>;
  storeOptions: { value: string; label: string }[];
  customFrom: Date | undefined;
  setCustomFrom: Dispatch<SetStateAction<Date | undefined>>;
  customTo: Date | undefined;
  setCustomTo: Dispatch<SetStateAction<Date | undefined>>;
  fromPickerOpen: boolean;
  setFromPickerOpen: Dispatch<SetStateAction<boolean>>;
  toPickerOpen: boolean;
  setToPickerOpen: Dispatch<SetStateAction<boolean>>;
  isStoreLocked: boolean;
  onExport: () => void;
  isExporting: boolean;
}) {
  return (
    <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-3 pt-1 -mx-4 px-4 md:-mx-6 md:px-6 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Period tabs */}
        <div className="overflow-x-auto">
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as ReportPeriod)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="week">{t("period.week")}</TabsTrigger>
              <TabsTrigger value="month">{t("period.month")}</TabsTrigger>
              <TabsTrigger value="quarter">{t("period.quarter")}</TabsTrigger>
              <TabsTrigger value="custom">{t("period.custom")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onExport}
            disabled={isExporting}
          >
            <Download className="size-3.5" />
            {t("toolbar.export_btn")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={ADMIN_ROUTES.reportsKpi}>
              <BarChart3 className="size-3.5" />
              {t("toolbar.kpi_btn")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Second row: custom date + store */}
      <div className="flex flex-wrap gap-2 items-center">
        {period === "custom" && (
          <>
            <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("toolbar.custom_from")}:{" "}
                  {customFrom
                    ? customFrom.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={(d) => { setCustomFrom(d); setFromPickerOpen(false); }}
                />
              </PopoverContent>
            </Popover>
            <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("toolbar.custom_to")}:{" "}
                  {customTo
                    ? customTo.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                    : "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={(d) => { setCustomTo(d); setToPickerOpen(false); }}
                />
              </PopoverContent>
            </Popover>
          </>
        )}
        {!isStoreLocked && (
          <div className="w-56">
            <Combobox
              options={storeOptions}
              value={storeId}
              onValueChange={setStoreId}
              placeholder={t("toolbar.store_placeholder")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
