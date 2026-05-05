"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { Service } from "@/lib/types";


const schema = z.object({
  newAmount: z
    .number({ message: "Введите число" })
    .positive("Сумма должна быть больше 0"),
  reason: z.string().min(10, "Минимум 10 символов"),
});

type FormValues = z.infer<typeof schema>;

interface AdjustAmountDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, newAmount: number, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export function AdjustAmountDialog({
  service,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AdjustAmountDialogProps) {
  const t = useTranslations("screen.freelanceServicesList");
  const tc = useTranslations("common");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      newAmount: service?.total_amount ?? 0,
      reason: "",
    },
  });

  async function handleSubmit(values: FormValues) {
    if (!service) return;
    await onSubmit(service.id, values.newAmount, values.reason);
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("adjust_dialog.title")}</DialogTitle>
          <DialogDescription>{t("adjust_dialog.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("adjust_dialog.new_amount_label")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("adjust_dialog.reason_label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("adjust_dialog.reason_placeholder")}
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "..." : t("adjust_dialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
