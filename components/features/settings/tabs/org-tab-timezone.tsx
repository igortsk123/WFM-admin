"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";

import type { TimezoneConfig } from "@/lib/api/organization";

// ─── IANA timezone list (common) ─────────────────────────────────────────────

const TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "Europe/Moscow",       label: "Москва UTC+3" },
  { value: "Europe/Samara",       label: "Самара UTC+4" },
  { value: "Asia/Yekaterinburg",  label: "Екатеринбург UTC+5" },
  { value: "Asia/Omsk",           label: "Омск UTC+6" },
  { value: "Asia/Novosibirsk",    label: "Новосибирск UTC+7" },
  { value: "Asia/Tomsk",          label: "Томск UTC+7" },
  { value: "Asia/Krasnoyarsk",    label: "Красноярск UTC+7" },
  { value: "Asia/Irkutsk",        label: "Иркутск UTC+8" },
  { value: "Asia/Yakutsk",        label: "Якутск UTC+9" },
  { value: "Asia/Vladivostok",    label: "Владивосток UTC+10" },
  { value: "Asia/Magadan",        label: "Магадан UTC+11" },
  { value: "Asia/Kamchatka",      label: "Камчатка UTC+12" },
  { value: "Europe/London",       label: "Лондон UTC+0/+1" },
  { value: "Europe/Berlin",       label: "Берлин UTC+1/+2" },
  { value: "UTC",                 label: "UTC+0" },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const tzSchema = z.object({
  timezone: z.string().min(1),
  date_format: z.enum(["VERBOSE", "DOT", "ISO"]),
  time_format: z.enum(["24H", "12H"]),
  week_start: z.enum(["MON", "SUN"]),
});

export type TimezoneFormValues = z.infer<typeof tzSchema>;

interface OrgTabTimezoneProps {
  config: TimezoneConfig;
  onDirty: () => void;
  onClean: () => void;
  onValuesChange: (values: TimezoneFormValues) => void;
  registerSubmit: (fn: () => Promise<void>) => void;
}

export function OrgTabTimezone({
  config,
  onDirty,
  onClean,
  onValuesChange,
  registerSubmit,
}: OrgTabTimezoneProps) {
  const t = useTranslations("screen.organizationSettings");

  const form = useForm<TimezoneFormValues>({
    resolver: zodResolver(tzSchema),
    defaultValues: {
      timezone: config.timezone,
      date_format: config.date_format,
      time_format: config.time_format,
      week_start: config.week_start,
    },
  });

  const { isDirty } = form.formState;
  React.useEffect(() => {
    if (isDirty) onDirty();
    else onClean();
  }, [isDirty, onDirty, onClean]);

  const values = form.watch();
  React.useEffect(() => {
    onValuesChange(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  React.useEffect(() => {
    registerSubmit(async () => {
      await form.trigger();
      form.reset(form.getValues());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Timezone */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">{t("timezone.tz_card")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("timezone.tz_label")}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={TIMEZONES}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Выберите часовой пояс"
                      searchPlaceholder="Поиск..."
                      className="w-full sm:w-72"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Alert className="mt-4">
              <Info className="size-4" />
              <AlertDescription className="text-sm">
                {t("timezone.tz_hint")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Display format */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">{t("timezone.format_card")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date format */}
            <FormField
              control={form.control}
              name="date_format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("timezone.date_format")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2 sm:flex-row sm:gap-6 mt-1"
                    >
                      {(["VERBOSE", "DOT", "ISO"] as const).map((fmt) => (
                        <div key={fmt} className="flex items-center gap-2">
                          <RadioGroupItem value={fmt} id={`date-${fmt}`} />
                          <Label htmlFor={`date-${fmt}`} className="cursor-pointer text-sm">
                            {t(`timezone.date_format_${fmt.toLowerCase()}` as Parameters<typeof t>[0])}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Time format */}
            <FormField
              control={form.control}
              name="time_format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("timezone.time_format")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-6 mt-1"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="24H" id="time-24h" />
                        <Label htmlFor="time-24h" className="cursor-pointer text-sm">
                          {t("timezone.time_24h")}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="12H" id="time-12h" />
                        <Label htmlFor="time-12h" className="cursor-pointer text-sm">
                          {t("timezone.time_12h")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Week start */}
            <FormField
              control={form.control}
              name="week_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("timezone.week_start")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-6 mt-1"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="MON" id="week-mon" />
                        <Label htmlFor="week-mon" className="cursor-pointer text-sm">
                          {t("timezone.week_start_mon")}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="SUN" id="week-sun" />
                        <Label htmlFor="week-sun" className="cursor-pointer text-sm">
                          {t("timezone.week_start_sun")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}
