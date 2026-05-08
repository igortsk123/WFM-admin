"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  isFashion: boolean;
  watchedRequiresPhoto: boolean;
  marketingChannelOptions: { value: string; label: string }[];
}

export function TaskFormControlSection({
  loadingData,
  isFashion,
  watchedRequiresPhoto,
  marketingChannelOptions,
}: Props) {
  const t = useTranslations("screen.taskForm");
  const form = useFormContext<TaskFormValues>();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("section_control")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="acceptance_policy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("field_acceptance_policy")}</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={loadingData}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="AUTO">{t("policy_auto")}</SelectItem>
                  <SelectItem value="MANUAL">{t("policy_manual")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requires_photo"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-3 gap-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium cursor-pointer">
                  {t("field_requires_photo")}
                </FormLabel>
                {watchedRequiresPhoto && (
                  <p className="text-xs text-muted-foreground">
                    {t("requires_photo_hint")}
                  </p>
                )}
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={loadingData}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="manager_comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("field_manager_comment")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("field_manager_comment_placeholder")}
                  rows={2}
                  className="resize-none"
                  disabled={loadingData}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fashion-only: Marketing channel */}
        {isFashion && (
          <FormField
            control={form.control}
            name="marketing_channel_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("field_marketing_channel")}</FormLabel>
                <FormControl>
                  <ComboboxField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={marketingChannelOptions}
                    placeholder={t("field_marketing_channel_placeholder")}
                    searchPlaceholder={t("search_placeholder")}
                    disabled={loadingData}
                  />
                </FormControl>
                {field.value && (
                  <p className="text-xs text-muted-foreground">
                    {t("marketing_channel_hint")}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
