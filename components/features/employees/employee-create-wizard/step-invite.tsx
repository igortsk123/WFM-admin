"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Step4Input } from "./_shared";

interface StepInviteProps {
  form: UseFormReturn<Step4Input>;
  t: (key: string) => string;
  hasEmail: boolean;
  onSubmit: () => void;
  /** Inline summary card rendered at the bottom of step 4 */
  summarySlot: ReactNode;
}

export function StepInvite({
  form,
  t,
  hasEmail,
  onSubmit,
  summarySlot,
}: StepInviteProps) {
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {/* Invite — toggle "отправить" + выбор канала */}
        <FormField
          control={form.control}
          name="invite_method"
          render={({ field }) => {
            const emailAvailable = hasEmail;
            const sendInvite = field.value !== "NONE";
            return (
              <FormItem>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-sm font-medium">{t("step4.send_invite")}</Label>
                    <span className="text-xs text-muted-foreground">{t("step4.send_invite_hint")}</span>
                  </div>
                  <Switch
                    checked={sendInvite}
                    onCheckedChange={(v) => field.onChange(v ? (emailAvailable ? "EMAIL" : "TELEGRAM") : "NONE")}
                  />
                </div>
                {sendInvite && (
                  <div className="mt-3">
                    <FormLabel className="text-sm">{t("step4.method")}</FormLabel>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="mt-2 grid grid-cols-2 gap-2"
                    >
                      <Label
                        htmlFor="invite-email"
                        className={cn(
                          "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                          !emailAvailable && "opacity-50 cursor-not-allowed",
                          field.value === "EMAIL" && "border-primary bg-primary/5",
                        )}
                      >
                        <RadioGroupItem value="EMAIL" id="invite-email" disabled={!emailAvailable} />
                        <span className="text-sm">{t("step4.method_email")}</span>
                      </Label>
                      <Label
                        htmlFor="invite-telegram"
                        className={cn(
                          "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                          field.value === "TELEGRAM" && "border-primary bg-primary/5",
                        )}
                      >
                        <RadioGroupItem value="TELEGRAM" id="invite-telegram" />
                        <span className="text-sm">Telegram</span>
                      </Label>
                      <Label
                        htmlFor="invite-max"
                        className={cn(
                          "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                          field.value === "MAX" && "border-primary bg-primary/5",
                        )}
                      >
                        <RadioGroupItem value="MAX" id="invite-max" />
                        <span className="text-sm">Max</span>
                      </Label>
                      <Label
                        htmlFor="invite-whatsapp"
                        className={cn(
                          "flex items-center gap-2 rounded-md border p-2 cursor-pointer",
                          field.value === "WHATSAPP" && "border-primary bg-primary/5",
                        )}
                      >
                        <RadioGroupItem value="WHATSAPP" id="invite-whatsapp" />
                        <span className="text-sm">WhatsApp</span>
                      </Label>
                    </RadioGroup>
                    {!emailAvailable && field.value === "EMAIL" && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t("step4.method_email_disabled_hint")}
                      </p>
                    )}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Invite message */}
        {form.watch("invite_method") !== "NONE" && (
          <FormField
            control={form.control}
            name="invite_message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("step4.message")}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    className="resize-none text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Notify manager */}
        <FormField
          control={form.control}
          name="notify_manager"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 rounded-lg border border-border p-4">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div>
                <Label className="text-sm font-medium cursor-pointer">
                  {t("step4.notify_manager")}
                </Label>
              </div>
            </FormItem>
          )}
        />

        {/* Summary card */}
        <div>{summarySlot}</div>
      </form>
    </Form>
  );
}
