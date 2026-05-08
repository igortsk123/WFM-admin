"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { DateTimeField } from "./_shared";
import type { TaskFormValues } from "./_shared";

interface Props {
  loadingData: boolean;
}

export function TaskFormWhenSection({ loadingData }: Props) {
  const t = useTranslations("screen.taskForm");
  const form = useFormContext<TaskFormValues>();
  const { watch, setValue } = form;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("section_when")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="planned_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("field_planned_minutes")} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={960}
                  className="w-32"
                  disabled={loadingData}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Controller
            control={form.control}
            name="scheduled_at_date"
            render={({ field: dateField, fieldState }) => (
              <FormItem>
                <FormLabel>{t("field_scheduled_at")}</FormLabel>
                <FormControl>
                  <DateTimeField
                    date={dateField.value}
                    onDateChange={dateField.onChange}
                    time={watch("scheduled_at_time")}
                    onTimeChange={(v) => setValue("scheduled_at_time", v)}
                    placeholder={t("field_scheduled_at_placeholder")}
                    disabled={loadingData}
                  />
                </FormControl>
                {fieldState.error && (
                  <p className="text-[0.8rem] font-medium text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </FormItem>
            )}
          />

          <Controller
            control={form.control}
            name="due_at_date"
            render={({ field: dateField, fieldState }) => (
              <FormItem>
                <FormLabel>{t("field_due_at")}</FormLabel>
                <FormControl>
                  <DateTimeField
                    date={dateField.value}
                    onDateChange={dateField.onChange}
                    time={watch("due_at_time")}
                    onTimeChange={(v) => setValue("due_at_time", v)}
                    placeholder={t("field_due_at_placeholder")}
                    disabled={loadingData}
                  />
                </FormControl>
                {fieldState.error && (
                  <p className="text-[0.8rem] font-medium text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
