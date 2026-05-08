import { Calendar, Clock, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Locale } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

import { HistoryDrawerContent } from "./history-drawer";
import {
  MOCK_SCOPE_OPTIONS,
  type GoalWithUser,
  type GoalsT,
  type PeriodFilter,
} from "./_shared";

export function GoalsToolbar({
  period,
  setPeriod,
  scopeId,
  setScopeId,
  scopeOpen,
  setScopeOpen,
  allGoals,
  locale,
  t,
}: {
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  scopeId: string;
  setScopeId: (id: string) => void;
  scopeOpen: boolean;
  setScopeOpen: (open: boolean) => void;
  allGoals: GoalWithUser[];
  locale: Locale;
  t: GoalsT;
}) {
  function getPeriodLabel(p: PeriodFilter): string {
    const now = new Date("2026-05-01");
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);

    if (p === "current") {
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${t("filters.current_week")} (${formatDate(startOfWeek, locale)} – ${formatDate(endOfWeek, locale)})`;
    }
    if (p === "next") return t("filters.next_week");
    return t("filters.previous_week");
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sticky top-0 z-10 bg-background py-2 -mt-2">
      {/* Period filter */}
      <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
        <SelectTrigger className="w-full sm:w-auto min-w-[260px]">
          <Calendar className="size-4 mr-2 text-muted-foreground" />
          <SelectValue>{getPeriodLabel(period)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">{getPeriodLabel("current")}</SelectItem>
          <SelectItem value="next">{t("filters.next_week")}</SelectItem>
          <SelectItem value="previous">{t("filters.previous_week")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Scope filter */}
      <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto min-w-[200px] justify-start">
            <Target className="size-4 mr-2 text-muted-foreground" />
            {MOCK_SCOPE_OPTIONS.find((o) => o.id === scopeId)?.name ?? t("filters.scope_label")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]" align="start">
          <Command>
            <CommandInput placeholder={t("filters.scope_label")} />
            <CommandList>
              <CommandEmpty>{t("empty.no_data_title")}</CommandEmpty>
              <CommandGroup>
                {MOCK_SCOPE_OPTIONS.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      setScopeId(option.id);
                      setScopeOpen(false);
                    }}
                  >
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* History drawer */}
      <div className="flex-1 sm:flex-none sm:ml-auto">
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Clock className="size-4 mr-2" />
              {t("actions.history")}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("actions.history")}</DrawerTitle>
            </DrawerHeader>
            <HistoryDrawerContent goals={allGoals} locale={locale} t={t} />
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
