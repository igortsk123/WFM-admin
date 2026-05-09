"use client";

import type { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

import { ZoneFormFields } from "./zone-form-fields";
import type { StoreOption, TFn, ZoneFormValues } from "./_shared";

interface DialogZoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  form: ReturnType<typeof useForm<ZoneFormValues>>;
  storeOptions: StoreOption[];
  isPending: boolean;
  onSubmit: (values: ZoneFormValues) => void;
  t: TFn;
}

export function DialogZoneForm({
  open,
  onOpenChange,
  title,
  form,
  storeOptions,
  isPending,
  onSubmit,
  t,
}: DialogZoneFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[70vh] pr-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ZoneFormFields
                form={form}
                storeOptions={storeOptions}
                t={t}
              />
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  {t("dialogs.cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "..." : t("dialogs.save")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
