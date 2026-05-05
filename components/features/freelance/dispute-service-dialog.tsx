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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { Service } from "@/lib/types";

const schema = z.object({
  reason: z.string().min(10, "Минимум 10 символов"),
});

type FormValues = z.infer<typeof schema>;

interface DisputeServiceDialogProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export function DisputeServiceDialog({
  service,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: DisputeServiceDialogProps) {
  const t = useTranslations("screen.freelanceServicesList");
  const tc = useTranslations("common");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  async function handleSubmit(values: FormValues) {
    if (!service) return;
    await onSubmit(service.id, values.reason);
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dispute_dialog.title")}</DialogTitle>
          <DialogDescription>{t("dispute_dialog.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dispute_dialog.reason_label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("dispute_dialog.reason_placeholder")}
                      className="min-h-[100px] resize-none"
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
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? "..." : t("dispute_dialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
