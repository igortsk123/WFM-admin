"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import type { OrganizationConfig } from "@/lib/api/organization";

// ─── Schema ─────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1),
  contact_email: z.string().email(),
  support_phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().max(500).optional(),
});

export type GeneralFormValues = z.infer<typeof generalSchema>;

interface OrgTabGeneralProps {
  config: OrganizationConfig;
  onDirty: () => void;
  onClean: () => void;
  onValuesChange: (values: GeneralFormValues) => void;
  registerSubmit: (fn: () => Promise<void>) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgTabGeneral({
  config,
  onDirty,
  onClean,
  onValuesChange,
  registerSubmit,
}: OrgTabGeneralProps) {
  const t = useTranslations("screen.organizationSettings");

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: config.name ?? "",
      contact_email: config.contact_email ?? "",
      support_phone: config.support_phone ?? "",
      website: config.website ?? "",
      description: config.description ?? "",
    },
  });

  // Track dirty state
  const { isDirty } = form.formState;
  React.useEffect(() => {
    if (isDirty) onDirty();
    else onClean();
  }, [isDirty, onDirty, onClean]);

  // Propagate values to parent for save bar
  const values = form.watch();
  React.useEffect(() => {
    onValuesChange(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  // Register submit handler
  React.useEffect(() => {
    registerSubmit(async () => {
      await form.trigger();
      form.reset(form.getValues());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const descriptionValue = form.watch("description") ?? "";

  return (
    <div className="space-y-6">
      {/* Organization type — read-only */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">{t("general.type_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <RadioGroup
              value={config.type}
              disabled
              className="flex flex-col gap-2 sm:flex-row"
            >
              {(["RETAIL", "PRODUCTION", "SMALL_BUSINESS"] as const).map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <RadioGroupItem value={type} id={`type-${type}`} />
                  <Label
                    htmlFor={`type-${type}`}
                    className="cursor-default text-sm"
                  >
                    {t(`general.type_${type}` as Parameters<typeof t>[0])}
                  </Label>
                  {config.type === type && (
                    <Badge variant="secondary" className="text-xs">
                      {config.type}
                    </Badge>
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("general.type_readonly_hint")}
          </p>
        </CardContent>
      </Card>

      {/* Contact information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            {t("general.contact_card")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("general.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("general.contact_email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="support_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("general.support_phone")}</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+7 (___) ___-__-__" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("general.website")}</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">{t("general.description_card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={t("general.description_placeholder")}
                      rows={4}
                      maxLength={500}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">
                      {t("general.description_counter", { count: descriptionValue.length })}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
