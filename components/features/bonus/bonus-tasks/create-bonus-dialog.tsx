"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { createBonusTask } from "@/lib/api/bonus";

import { BONUS_SOURCES } from "./_shared";

const createSchema = z.object({
  title: z.string().min(5),
  points: z.number().min(1),
  source: z.enum(["YESTERDAY_INCOMPLETE", "SUPERVISOR_BUDGET", "GOAL_LINKED"]),
});

type CreateFormValues = z.infer<typeof createSchema>;

interface CreateBonusTaskDialogProps {
  storeId?: number;
  onCreated: () => void;
}

export function CreateBonusTaskDialog({ storeId, onCreated }: CreateBonusTaskDialogProps) {
  const t = useTranslations("screen.bonusTasks");
  const [open, setOpen] = useState(false);
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", points: 100, source: "SUPERVISOR_BUDGET" },
  });

  const onSubmit = async (values: CreateFormValues) => {
    const res = await createBonusTask({
      title: values.title,
      store_id: storeId ?? 1,
      bonus_points: values.points,
      bonus_source: values.source,
      type: "BONUS",
    });
    if (res.success) {
      toast.success(t("toasts.task_created"));
      form.reset();
      setOpen(false);
      onCreated();
    } else {
      toast.error(t("toasts.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 gap-2">
          <Plus className="size-4" aria-hidden="true" />
          {t("actions.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("create_dialog.title")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create_dialog.name_label")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: Выкладка молочного отдела" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create_dialog.points_label")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("create_dialog.step1_title")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-2"
                    >
                      {BONUS_SOURCES.map((src) => (
                        <div key={src} className="flex items-center gap-2">
                          <RadioGroupItem value={src} id={`src-${src}`} />
                          <Label htmlFor={`src-${src}`} className="text-sm cursor-pointer">
                            {t(
                              `create_dialog.source_${src === "SUPERVISOR_BUDGET" ? "budget" : src === "GOAL_LINKED" ? "goal" : "yesterday"}`,
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("actions.reject")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {t("create_dialog.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
