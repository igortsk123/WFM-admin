"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import type { TaskFormValues } from "./_shared";

interface Props {
  loadingData: boolean;
  hasActiveGoal: boolean;
}

export function TaskFormGeneralSection({ loadingData, hasActiveGoal }: Props) {
  const t = useTranslations("screen.taskForm");
  const form = useFormContext<TaskFormValues>();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("section_general")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("field_title")} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t("field_title_placeholder")}
                  maxLength={120}
                  disabled={loadingData}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("field_description")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("field_description_placeholder")}
                  rows={4}
                  maxLength={1000}
                  disabled={loadingData}
                  className="resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("field_type")}</FormLabel>
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
                  <SelectItem value="PLANNED">{t("type_planned")}</SelectItem>
                  <SelectItem value="BONUS" disabled={!hasActiveGoal}>
                    {t("type_bonus")}
                    {!hasActiveGoal && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({t("type_bonus_hint")})
                      </span>
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
