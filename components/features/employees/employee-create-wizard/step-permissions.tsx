"use client";

import type { UseFormReturn } from "react-hook-form";
import { ShieldCheck, Info } from "lucide-react";

import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PermissionPill } from "@/components/shared";
import type { Permission } from "@/lib/types";
import {
  PERMISSIONS_LIST,
  PERM_ICONS,
  type Step3Values,
} from "./_shared";

interface StepPermissionsProps {
  form: UseFormReturn<Step3Values>;
  t: (key: string) => string;
  isManagerPosition: boolean;
  onSubmit: () => void;
}

export function StepPermissions({
  form,
  t,
  isManagerPosition,
  onSubmit,
}: StepPermissionsProps) {
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">
            {t("step3.title")}
          </h2>
        </div>

        {isManagerPosition ? (
          <Alert className="border-warning/30 bg-warning/5">
            <ShieldCheck className="size-4 text-warning" />
            <AlertDescription>
              <span className="font-medium">{t("step3.manager_skip")}</span>
              <br />
              <span className="text-xs text-muted-foreground">
                {t("step3.manager_skip_subtitle")}
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="border-info/30 bg-info/5">
              <Info className="size-4 text-info" />
              <AlertDescription className="text-sm">
                {t("step3.info_alert")}
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {PERMISSIONS_LIST.map((perm) => {
                      const isChecked = (field.value as Permission[]).includes(perm);
                      return (
                        <label
                          key={perm}
                          htmlFor={`perm-${perm}`}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                            isChecked
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-card hover:bg-muted/30"
                          )}
                        >
                          <Checkbox
                            id={`perm-${perm}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const current = field.value as Permission[];
                              if (checked) {
                                field.onChange([...current, perm]);
                              } else {
                                field.onChange(current.filter((p) => p !== perm));
                              }
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {PERM_ICONS[perm]}
                              <PermissionPill permission={perm} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {perm === "CASHIER" && t("step3.permission_cashier")}
                              {perm === "SALES_FLOOR" && t("step3.permission_sales_floor")}
                              {perm === "SELF_CHECKOUT" && t("step3.permission_self_checkout")}
                              {perm === "WAREHOUSE" && t("step3.permission_warehouse")}
                              {perm === "PRODUCTION_LINE" && t("step3.permission_production_line")}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </form>
    </Form>
  );
}
