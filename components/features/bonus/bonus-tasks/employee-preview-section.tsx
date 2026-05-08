"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import { getEmployeeBonusPreview } from "@/lib/api/bonus";
import type { BonusTaskWithSource } from "@/lib/api/bonus";
import { getUsers } from "@/lib/api/users";
import type { User as UserModel } from "@/lib/types";

import { fmtRub } from "./_shared";

interface EmployeePreviewSectionProps {
  storeId?: number;
  locale: string;
}

export function EmployeePreviewSection({ storeId, locale }: EmployeePreviewSectionProps) {
  const t = useTranslations("screen.bonusTasks.preview");
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [employees, setEmployees] = useState<UserModel[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserModel | null>(null);
  const [preview, setPreview] = useState<{
    visible_now_sum: number;
    available_tasks: BonusTaskWithSource[];
  } | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (open && employees.length === 0) {
      setLoadingEmployees(true);
      getUsers({ employment_type: "STAFF", page_size: 50, store_id: storeId }).then(
        (res) => {
          setEmployees(res.data.filter((u) => !u.archived));
          setLoadingEmployees(false);
        },
      );
    }
  }, [open, employees.length, storeId]);

  useEffect(() => {
    if (!selectedUser) return;
    setLoadingPreview(true);
    setPreview(null);
    getEmployeeBonusPreview(selectedUser.id, storeId).then((res) => {
      setPreview(res.data);
      setLoadingPreview(false);
    });
  }, [selectedUser, storeId]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card">
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-xl"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-semibold">{t("section_title")}</span>
          </div>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Employee combobox */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t("select_employee_label")}
            </label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full max-w-sm justify-between text-sm h-9"
                >
                  {selectedUser
                    ? `${selectedUser.last_name} ${selectedUser.first_name}`
                    : t("select_employee_placeholder")}
                  <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("select_employee_placeholder")} />
                  <CommandEmpty>
                    {loadingEmployees ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        Загрузка...
                      </div>
                    ) : (
                      "Не найдено"
                    )}
                  </CommandEmpty>
                  <CommandGroup className="max-h-56 overflow-y-auto">
                    {employees.map((emp) => (
                      <CommandItem
                        key={emp.id}
                        value={`${emp.last_name} ${emp.first_name}`}
                        onSelect={() => {
                          setSelectedUser(emp);
                          setComboOpen(false);
                        }}
                      >
                        <span className="truncate">
                          {emp.last_name} {emp.first_name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Preview cards */}
          {selectedUser && (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Visible now card */}
              <Card className="rounded-lg bg-muted/40 border-dashed">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("visible_now_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {loadingPreview ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-bold text-foreground">
                        {fmtRub(preview?.visible_now_sum ?? 0, locale)}
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("visible_now_hint")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* After planned card */}
              <Card className="rounded-lg bg-success/5 border-success/20">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold text-success/80 uppercase tracking-wide">
                    {t("after_planned_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {loadingPreview ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-3/4" />
                    </div>
                  ) : preview?.available_tasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("empty_no_bonuses")}</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {(preview?.available_tasks ?? []).slice(0, 4).map((task) => (
                        <li
                          key={task.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-xs text-foreground truncate">
                            {task.title}
                          </span>
                          <span className="text-xs font-semibold text-success shrink-0">
                            {task.bonus_points} ₽
                          </span>
                        </li>
                      ))}
                      {(preview?.available_tasks.length ?? 0) > 4 && (
                        <li className="text-xs text-muted-foreground">
                          +{(preview?.available_tasks.length ?? 0) - 4} ещё...
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
