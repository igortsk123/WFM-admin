"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import type { Permission } from "@/lib/types";

interface Props {
  loadingData: boolean;
  workerOptions: { value: string; label: string }[];
  permissionOptions: { value: Permission; label: string }[];
  watchedAssignmentType?: "specific" | "permission";
  watchedIsChain: boolean;
  watchedNextAssignmentType?: "specific" | "permission";
}

export function TaskFormWhoSection({
  loadingData,
  workerOptions,
  permissionOptions,
  watchedAssignmentType,
  watchedIsChain,
  watchedNextAssignmentType,
}: Props) {
  const t = useTranslations("screen.taskForm");
  const form = useFormContext<TaskFormValues>();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("section_who")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="assignment_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("field_assignment_type")}</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-col gap-2 sm:flex-row"
                  disabled={loadingData}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="specific" id="assign-specific" />
                    <Label htmlFor="assign-specific" className="font-normal cursor-pointer">
                      {t("assignment_specific")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="permission" id="assign-permission" />
                    <Label htmlFor="assign-permission" className="font-normal cursor-pointer">
                      {t("assignment_permission")}
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedAssignmentType === "specific" ? (
          <FormField
            control={form.control}
            name="assignee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("field_assignee")} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <ComboboxField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={workerOptions}
                    placeholder={t("field_assignee_placeholder")}
                    searchPlaceholder={t("field_assignee_placeholder")}
                    disabled={loadingData}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="assigned_to_permission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("field_permission")} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <ComboboxField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={permissionOptions.map((p) => ({
                      value: p.value,
                      label: p.label,
                    }))}
                    placeholder={t("field_permission_placeholder")}
                    searchPlaceholder={t("search_placeholder")}
                    disabled={loadingData}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {t("assignment_permission_hint")}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Chain switch */}
        <FormField
          control={form.control}
          name="is_chain"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-3 gap-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium cursor-pointer">
                  {t("chain_label")}
                </FormLabel>
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

        {watchedIsChain && (
          <div className="space-y-3 rounded-lg bg-muted/40 p-3 border border-border">
            <p className="text-xs text-muted-foreground">{t("chain_hint")}</p>

            <FormField
              control={form.control}
              name="next_assignment_type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value ?? "specific"}
                      onValueChange={field.onChange}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="specific" id="next-specific" />
                        <Label htmlFor="next-specific" className="font-normal cursor-pointer text-sm">
                          {t("assignment_specific")}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="permission" id="next-permission" />
                        <Label htmlFor="next-permission" className="font-normal cursor-pointer text-sm">
                          {t("assignment_permission")}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {watchedNextAssignmentType === "specific" ? (
              <FormField
                control={form.control}
                name="next_assignee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t("field_next_assignee")}</FormLabel>
                    <FormControl>
                      <ComboboxField
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        options={workerOptions}
                        placeholder={t("field_next_assignee_placeholder")}
                        searchPlaceholder={t("search_placeholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="next_permission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t("field_next_permission")}</FormLabel>
                    <FormControl>
                      <ComboboxField
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        options={permissionOptions.map((p) => ({
                          value: p.value,
                          label: p.label,
                        }))}
                        placeholder={t("field_permission_placeholder")}
                        searchPlaceholder={t("search_placeholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
