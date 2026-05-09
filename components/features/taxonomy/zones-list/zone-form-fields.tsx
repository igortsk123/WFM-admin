"use client";

import { Globe, Store } from "lucide-react";
import type { useForm } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/combobox";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import {
  ICON_OPTIONS,
  type StoreOption,
  type TFn,
  type ZoneFormValues,
} from "./_shared";

interface ZoneFormFieldsProps {
  form: ReturnType<typeof useForm<ZoneFormValues>>;
  storeOptions: StoreOption[];
  t: TFn;
}

export function ZoneFormFields({
  form,
  storeOptions,
  t,
}: ZoneFormFieldsProps) {
  const scopeValue = form.watch("scope");
  const iconValue = form.watch("icon");

  return (
    <div className="flex flex-col gap-4">
      {/* code */}
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.fields.code")}</FormLabel>
            <FormControl>
              <Input
                {...field}
                className="font-mono uppercase"
                placeholder="SALES_FLOOR"
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.fields.name")}</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Торговый зал" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("dialogs.fields.description")}{" "}
              <span className="text-muted-foreground text-xs">
                (необязательно)
              </span>
            </FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* scope */}
      <FormField
        control={form.control}
        name="scope"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.fields.scope")}</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="GLOBAL" id="scope-global" />
                  <Globe className="size-4 text-muted-foreground" />
                  <Label htmlFor="scope-global" className="cursor-pointer">
                    {t("dialogs.fields.scope_global")}
                  </Label>
                </div>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="STORE" id="scope-store" />
                  <Store className="size-4 text-muted-foreground" />
                  <Label htmlFor="scope-store" className="cursor-pointer">
                    {t("dialogs.fields.scope_store")}
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* store_id — only visible when scope=STORE */}
      {scopeValue === "STORE" && (
        <FormField
          control={form.control}
          name="store_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("dialogs.fields.store_id")}</FormLabel>
              <FormControl>
                <Combobox
                  options={storeOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("filters.store")}
                  searchPlaceholder="Поиск магазина..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* icon */}
      <FormField
        control={form.control}
        name="icon"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.fields.icon")}</FormLabel>
            <FormControl>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map(({ value, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={`flex size-10 items-center justify-center rounded-md border transition-colors hover:border-primary ${
                      iconValue === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                    aria-label={value}
                    aria-pressed={iconValue === value}
                  >
                    <Icon className="size-5" />
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* active */}
      <FormField
        control={form.control}
        name="active"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
            <FormLabel className="cursor-pointer">
              {t("dialogs.fields.active")}
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
    </div>
  );
}
