"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { ComboboxField } from "./_shared";
import type { TaskFormValues } from "./_shared";
import type { WorkType } from "@/lib/types";

interface Props {
  loadingData: boolean;
  workTypeOptions: { value: string; label: string; hint?: string }[];
  categoryOptions: { value: string; label: string }[];
  watchedWorkTypeId?: string;
  selectedWorkType?: WorkType;
}

export function TaskFormWorkSection({
  loadingData,
  workTypeOptions,
  categoryOptions,
  watchedWorkTypeId,
  selectedWorkType,
}: Props) {
  const t = useTranslations("screen.taskForm");
  const form = useFormContext<TaskFormValues>();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("section_work")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="work_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("field_work_type")} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <ComboboxField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={workTypeOptions}
                  placeholder={t("field_work_type_placeholder")}
                  searchPlaceholder={t("search_placeholder")}
                  disabled={loadingData}
                />
              </FormControl>
              {watchedWorkTypeId && selectedWorkType && (
                <p className="text-xs text-muted-foreground">
                  {t("field_work_type_duration_hint", {
                    min: selectedWorkType.default_duration_min,
                  })}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="product_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("field_product_category")}</FormLabel>
              <FormControl>
                <ComboboxField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={categoryOptions}
                  placeholder={t("field_product_category_placeholder")}
                  searchPlaceholder={t("search_placeholder")}
                  disabled={loadingData}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
