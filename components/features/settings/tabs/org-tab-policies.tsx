"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { TaskPoliciesConfig } from "@/lib/api/organization";

// ─── Schema ───────────────────────────────────────────────────────────────────

const policiesSchema = z.object({
  acceptance_policy: z.enum(["AUTO", "MANUAL"]),
  requires_photo_default: z.boolean(),
  deviation_pct: z.number().int().min(1).max(50),
  auto_accept_hours: z.number().int().min(1).max(72),
  min_reject_reason_length: z.number().int().min(1).max(500),
  require_reject_category: z.boolean(),
});

export type PoliciesFormValues = z.infer<typeof policiesSchema>;

interface OrgTabPoliciesProps {
  config: TaskPoliciesConfig;
  onDirty: () => void;
  onClean: () => void;
  onValuesChange: (values: PoliciesFormValues) => void;
  registerSubmit: (fn: () => Promise<void>) => void;
}

export function OrgTabPolicies({
  config,
  onDirty,
  onClean,
  onValuesChange,
  registerSubmit,
}: OrgTabPoliciesProps) {
  const t = useTranslations("screen.organizationSettings");

  const form = useForm<PoliciesFormValues>({
    resolver: zodResolver(policiesSchema),
    defaultValues: {
      acceptance_policy: config.acceptance_policy,
      requires_photo_default: config.requires_photo_default,
      deviation_pct: config.deviation_pct,
      auto_accept_hours: config.auto_accept_hours,
      min_reject_reason_length: config.min_reject_reason_length,
      require_reject_category: config.require_reject_category,
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
        {/* Default card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">{t("policies.default_card")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Acceptance policy */}
            <FormField
              control={form.control}
              name="acceptance_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("policies.acceptance_policy")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANUAL">{t("policies.acceptance_MANUAL")}</SelectItem>
                      <SelectItem value="AUTO">{t("policies.acceptance_AUTO")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {t("policies.acceptance_policy_desc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requires photo */}
            <FormField
              control={form.control}
              name="requires_photo_default"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <FormLabel className="cursor-pointer flex-1">
                    {t("policies.requires_photo")}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Deviation pct */}
            <FormField
              control={form.control}
              name="deviation_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("policies.deviation_pct")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 w-32">
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">%</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto-accept hours */}
            <FormField
              control={form.control}
              name="auto_accept_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("policies.auto_accept_hours")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 w-32">
                      <Input
                        type="number"
                        min={1}
                        max={72}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">ч</span>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    {t("policies.auto_accept_hours_desc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Reject reason card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">{t("policies.reject_card")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="min_reject_reason_length"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("policies.min_reason_length")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 w-32">
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">симв.</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="require_reject_category"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <FormLabel className="cursor-pointer flex-1">
                    {t("policies.require_reject_category")}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
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
