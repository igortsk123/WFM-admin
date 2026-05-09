"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores";

import { Button } from "@/components/ui/button";
import { LazyCalendar as Calendar } from "@/components/shared/lazy-calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════

const createPeriodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  rate_per_point: z.number().min(1).max(1000),
  store_ids: z.array(z.number()).optional(),
  include_bonus: z.boolean(),
});

type CreatePeriodFormValues = z.infer<typeof createPeriodSchema>;

// ═══════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════

interface CreatePeriodFormProps {
  onSubmit: (data: {
    name: string;
    period_start: string;
    period_end: string;
    rate_per_point: number;
    store_ids?: number[];
    include_bonus: boolean;
  }) => Promise<void>;
  submitting: boolean;
  onCancel: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function CreatePeriodForm({
  onSubmit,
  submitting,
  onCancel,
}: CreatePeriodFormProps) {
  const t = useTranslations("screen.payouts.create_dialog");
  const tCommon = useTranslations("common");

  // Default to current month
  const now = new Date();
  const defaultMonth = format(now, "LLLL yyyy", { locale: ru });
  const capitalizedMonth = defaultMonth.charAt(0).toUpperCase() + defaultMonth.slice(1);

  const form = useForm<CreatePeriodFormValues>({
    resolver: zodResolver(createPeriodSchema),
    defaultValues: {
      name: capitalizedMonth,
      dateRange: {
        from: startOfMonth(now),
        to: endOfMonth(now),
      },
      rate_per_point: 1,
      store_ids: undefined,
      include_bonus: true,
    },
  });

  const [storeSelection, setStoreSelection] = useState<string>("all");

  async function handleSubmit(values: CreatePeriodFormValues) {
    await onSubmit({
      name: values.name,
      period_start: format(values.dateRange.from, "yyyy-MM-dd"),
      period_end: format(values.dateRange.to, "yyyy-MM-dd"),
      rate_per_point: values.rate_per_point,
      store_ids: storeSelection === "all" ? undefined : [parseInt(storeSelection)],
      include_bonus: values.include_bonus,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name_label")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Апрель 2026" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("dates_label")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "d MMM yyyy", { locale: ru })} —{" "}
                            {format(field.value.to, "d MMM yyyy", { locale: ru })}
                          </>
                        ) : (
                          format(field.value.from, "d MMM yyyy", { locale: ru })
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={field.value?.from}
                    selected={field.value}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        field.onChange(range);
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rate_per_point"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("rate_label")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("stores_label")}</label>
          <Select value={storeSelection} onValueChange={setStoreSelection}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("stores_all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("stores_all")}</SelectItem>
              {DEMO_TOP_STORES.slice(0, 3).map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FormField
          control={form.control}
          name="include_bonus"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <FormLabel className="text-sm font-normal cursor-pointer">
                {t("include_bonus_label")}
              </FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t("submit")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
