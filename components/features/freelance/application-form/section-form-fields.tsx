"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Store } from "@/lib/types/index";

import { today, type FormValues, type WorkTypeOption } from "./_shared";

interface FormFieldsProps {
  form: UseFormReturn<FormValues>;
  isDirector: boolean;
  availableStores: Store[];
  selectedStore: Store | undefined;
  watchedStoreId: number | undefined;
  workTypeOptions: WorkTypeOption[];
  loadingNorms: boolean;
}

export function FormFields({
  form,
  isDirector,
  availableStores,
  selectedStore,
  watchedStoreId,
  workTypeOptions,
  loadingNorms,
}: FormFieldsProps) {
  const t = useTranslations("screen.freelanceApplicationNew");
  const tCommon = useTranslations("common");

  const [storeOpen, setStoreOpen] = useState(false);
  const [workTypeOpen, setWorkTypeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  return (
    <>
      {/* ── 1. Store / Object ── */}
      <FormField
        control={form.control}
        name="store_id"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-sm font-medium">
              {t("form.store_label")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FormLabel>
            {isDirector ? (
              /* Locked for STORE_DIRECTOR */
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                {selectedStore?.name ?? t("form.store_placeholder")}
              </div>
            ) : (
              <Popover open={storeOpen} onOpenChange={setStoreOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={storeOpen}
                      className={cn(
                        "w-full justify-between font-normal min-h-[44px]",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate">
                        {selectedStore?.name ?? t("form.store_placeholder")}
                      </span>
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder={t("form.store_search_placeholder")}
                    />
                    <CommandList>
                      <CommandEmpty>{t("form.store_empty")}</CommandEmpty>
                      <CommandGroup>
                        {availableStores.map((store) => (
                          <CommandItem
                            key={store.id}
                            value={store.name}
                            onSelect={() => {
                              field.onChange(store.id);
                              form.setValue(
                                "work_type_id",
                                undefined as unknown as number
                              );
                              setStoreOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                field.value === store.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="flex flex-col">
                              <span>{store.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {store.city}
                              </span>
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ── 2. Planned Date ── */}
      <FormField
        control={form.control}
        name="planned_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-sm font-medium">
              {t("form.date_label")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FormLabel>
            {/* Mobile native input fallback */}
            <div className="md:hidden">
              <FormControl>
                <Input
                  type="date"
                  min={
                    isDirector
                      ? format(addDays(today(), 3), "yyyy-MM-dd")
                      : undefined
                  }
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      field.onChange(new Date(e.target.value + "T00:00:00"));
                    }
                  }}
                  className="h-11"
                />
              </FormControl>
            </div>
            {/* Desktop calendar popover */}
            <div className="hidden md:block">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal min-h-[44px]",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4 shrink-0" />
                      {field.value
                        ? format(field.value, "d MMMM yyyy", { locale: ru })
                        : t("form.date_placeholder")}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(d) => {
                      field.onChange(d);
                      setDateOpen(false);
                    }}
                    disabled={
                      isDirector
                        ? (date) =>
                            isBefore(startOfDay(date), addDays(today(), 3))
                        : undefined
                    }
                    initialFocus
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ── 3. Requested Hours ── */}
      <FormField
        control={form.control}
        name="requested_hours"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">
              {t("form.hours_label")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                className="h-11"
                {...field}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(parseFloat(e.target.value) || 0)
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ── 4. Work Type ── */}
      <FormField
        control={form.control}
        name="work_type_id"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-sm font-medium">
              {t("form.work_type_label")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FormLabel>
            <Popover open={workTypeOpen} onOpenChange={setWorkTypeOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={workTypeOpen}
                    disabled={!watchedStoreId || loadingNorms}
                    className={cn(
                      "w-full justify-between font-normal min-h-[44px]",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">
                      {loadingNorms ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          {tCommon("loading")}
                        </span>
                      ) : field.value ? (
                        (workTypeOptions.find((w) => w.id === field.value)
                          ?.name ?? t("form.work_type_placeholder"))
                      ) : (
                        t("form.work_type_placeholder")
                      )}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command>
                  <CommandInput
                    placeholder={t("form.work_type_search_placeholder")}
                  />
                  <CommandList>
                    <CommandEmpty>{t("form.work_type_empty")}</CommandEmpty>
                    <CommandGroup>
                      {workTypeOptions.map((wt) => (
                        <CommandItem
                          key={wt.id}
                          value={wt.name}
                          onSelect={() => {
                            field.onChange(wt.id);
                            setWorkTypeOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              field.value === wt.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {wt.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ── 5. Comment ── */}
      <FormField
        control={form.control}
        name="comment"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-muted-foreground">
              {t("form.comment_label")}
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("form.comment_placeholder")}
                maxLength={500}
                rows={3}
                className="resize-none"
              />
            </FormControl>
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">
                {(field.value ?? "").length}/500
              </span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
