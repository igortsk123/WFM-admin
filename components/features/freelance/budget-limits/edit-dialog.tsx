"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import type { BudgetPeriod } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { BudgetPeriodBadge } from "./period-badge";
import { PERIODS, type LimitFormValues } from "./_shared";

interface LimitFormProps {
  mode: "create" | "edit";
  initial?: LimitFormValues;
  storeOptions: ComboboxOption[];
  lockedStore?: boolean;
  lockedPeriod?: boolean;
  onSubmit: (values: LimitFormValues) => Promise<void>;
  onCancel: () => void;
}

export function LimitForm({
  mode,
  initial,
  storeOptions,
  lockedStore,
  lockedPeriod,
  onSubmit,
  onCancel,
}: LimitFormProps) {
  const t = useTranslations("screen.freelanceBudgetLimits");
  const tCommon = useTranslations("common");

  const [values, setValues] = useState<LimitFormValues>(
    initial ?? {
      store_id: null,
      store_name: "",
      period: "",
      amount: "",
      valid_from: new Date(),
      valid_to: undefined,
    }
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof LimitFormValues, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errs: Partial<Record<keyof LimitFormValues, string>> = {};
    if (!values.store_id) errs.store_id = t("validation.amount_required");
    if (!values.period) errs.period = t("validation.amount_required");
    if (!values.amount || values.amount.trim() === "")
      errs.amount = t("validation.amount_required");
    else if (parseFloat(values.amount) <= 0)
      errs.amount = t("validation.amount_positive");
    if (!values.valid_from)
      errs.valid_from = t("validation.valid_from_required");
    if (
      values.valid_to &&
      values.valid_from &&
      values.valid_to <= values.valid_from
    )
      errs.valid_to = t("validation.valid_to_after_from");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
      {/* Object */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="store">{t("sheet.object_label")}</Label>
        {lockedStore ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {values.store_name}
          </div>
        ) : (
          <>
            <Combobox
              options={storeOptions}
              value={values.store_id ? String(values.store_id) : ""}
              onValueChange={(val) => {
                const opt = storeOptions.find((o) => o.value === val);
                setValues((v) => ({
                  ...v,
                  store_id: val ? parseInt(val, 10) : null,
                  store_name: opt?.label ?? "",
                }));
                if (errors.store_id)
                  setErrors((e) => ({ ...e, store_id: undefined }));
              }}
              placeholder={t("sheet.object_placeholder")}
              searchPlaceholder={t("filters.search_object")}
            />
            {errors.store_id && (
              <p className="text-xs text-destructive">{errors.store_id}</p>
            )}
          </>
        )}
      </div>

      {/* Period */}
      <div className="flex flex-col gap-1.5">
        <Label>{t("sheet.period_label")}</Label>
        {lockedPeriod ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground">
            <BudgetPeriodBadge period={values.period as BudgetPeriod} />
          </div>
        ) : (
          <>
            <Select
              value={values.period}
              onValueChange={(val) => {
                setValues((v) => ({ ...v, period: val as BudgetPeriod }));
                if (errors.period)
                  setErrors((e) => ({ ...e, period: undefined }));
              }}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder={t("sheet.period_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`period.${p}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.period && (
              <p className="text-xs text-destructive">{errors.period}</p>
            )}
          </>
        )}
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">{t("sheet.amount_label")}</Label>
        <Input
          id="amount"
          type="number"
          min={1}
          step={100}
          placeholder="50 000"
          className="min-h-11"
          value={values.amount}
          onChange={(e) => {
            setValues((v) => ({ ...v, amount: e.target.value }));
            if (errors.amount)
              setErrors((er) => ({ ...er, amount: undefined }));
          }}
          aria-invalid={!!errors.amount}
        />
        {errors.amount && (
          <p className="text-xs text-destructive">{errors.amount}</p>
        )}
      </div>

      {/* Valid from */}
      <div className="flex flex-col gap-1.5">
        <Label>{t("sheet.valid_from_label")}</Label>
        <DatePicker
          date={values.valid_from}
          onDateChange={(d) => {
            setValues((v) => ({ ...v, valid_from: d }));
            if (errors.valid_from)
              setErrors((e) => ({ ...e, valid_from: undefined }));
          }}
          placeholder={t("sheet.valid_from_label")}
          className="min-h-11"
        />
        {errors.valid_from && (
          <p className="text-xs text-destructive">{errors.valid_from}</p>
        )}
      </div>

      {/* Valid to */}
      <div className="flex flex-col gap-1.5">
        <Label>
          {t("sheet.valid_to_label")}{" "}
          <span className="text-muted-foreground font-normal text-xs">
            ({t("sheet.valid_to_placeholder")})
          </span>
        </Label>
        <div className="relative">
          <DatePicker
            date={values.valid_to}
            onDateChange={(d) => {
              setValues((v) => ({ ...v, valid_to: d }));
              if (errors.valid_to)
                setErrors((e) => ({ ...e, valid_to: undefined }));
            }}
            placeholder={t("indefinite")}
            className="min-h-11"
          />
          {values.valid_to && (
            <button
              type="button"
              aria-label="Clear end date"
              className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() =>
                setValues((v) => ({ ...v, valid_to: undefined }))
              }
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {errors.valid_to && (
          <p className="text-xs text-destructive">{errors.valid_to}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {mode === "create"
            ? t("sheet.submit_create")
            : t("sheet.submit_edit")}
        </Button>
      </div>
    </form>
  );
}
