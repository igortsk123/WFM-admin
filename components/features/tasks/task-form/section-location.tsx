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

interface Props {
  loadingData: boolean;
  storeOptions: { value: string; label: string; hint?: string }[];
  zoneOptions: { value: string; label: string }[];
  watchedStoreId?: string;
}

export function TaskFormLocationSection({
  loadingData,
  storeOptions,
  zoneOptions,
  watchedStoreId,
}: Props) {
  const t = useTranslations("screen.taskForm");
  const form = useFormContext<TaskFormValues>();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("section_location")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="store_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("field_store")} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <ComboboxField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={storeOptions}
                  placeholder={t("field_store_placeholder")}
                  searchPlaceholder={t("search_placeholder")}
                  disabled={loadingData}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="zone_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("field_zone")} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <ComboboxField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={zoneOptions}
                  placeholder={
                    watchedStoreId
                      ? t("field_zone_placeholder")
                      : t("field_zone_disabled")
                  }
                  searchPlaceholder={t("search_placeholder")}
                  disabled={!watchedStoreId || loadingData}
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
