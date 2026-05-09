import type { ObjectFormat, ServiceNormUnit } from "@/lib/types";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CURRENCIES,
  OBJECT_FORMATS,
  UNITS,
  type NormFormState,
  type TFn,
} from "./_shared";

interface NormFormBodyProps {
  form: NormFormState;
  onChange: (next: NormFormState) => void;
  tFreelance: TFn;
  t: TFn;
}

export function NormFormBody({ form, onChange, tFreelance, t }: NormFormBodyProps) {
  const set = <K extends keyof NormFormState>(key: K, value: NormFormState[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="flex flex-col gap-5">
      {/* Object format */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="norm-format" className="text-sm font-medium">
          {t("form.object_format_label")}
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={form.object_format}
          onValueChange={(v) => set("object_format", v as ObjectFormat)}
        >
          <SelectTrigger id="norm-format" className="h-11">
            <SelectValue placeholder={t("filters.all_formats")} />
          </SelectTrigger>
          <SelectContent>
            {OBJECT_FORMATS.map((fmt) => (
              <SelectItem key={fmt} value={fmt}>
                {tFreelance(`object_format.${fmt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="norm-work-type" className="text-sm font-medium">
          {t("form.work_type_label")}
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Select
          value={form.work_type_id}
          onValueChange={(v) => set("work_type_id", v)}
        >
          <SelectTrigger id="norm-work-type" className="h-11">
            <SelectValue placeholder={t("filters.all_work_types")} />
          </SelectTrigger>
          <SelectContent>
            {MOCK_WORK_TYPES.map((wt) => (
              <SelectItem key={wt.id} value={String(wt.id)}>
                {wt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Normative per hour + unit (row) */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Label htmlFor="norm-value" className="text-sm font-medium">
            {t("form.normative_label")}
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="norm-value"
            type="number"
            min={1}
            step={1}
            className="h-11"
            value={form.normative_per_hour}
            onChange={(e) => set("normative_per_hour", e.target.value)}
            placeholder="200"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-36 shrink-0">
          <Label htmlFor="norm-unit" className="text-sm font-medium">
            {t("form.unit_label")}
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </Label>
          <Select
            value={form.unit}
            onValueChange={(v) => set("unit", v as ServiceNormUnit)}
          >
            <SelectTrigger id="norm-unit" className="h-11">
              <SelectValue placeholder="SKU" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {tFreelance(`normative.unit.${u}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rate + currency */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Label htmlFor="norm-rate" className="text-sm font-medium">
            {t("form.rate_label")}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({t("form.rate_placeholder")})
            </span>
          </Label>
          <Input
            id="norm-rate"
            type="number"
            min={0}
            step={10}
            className="h-11"
            value={form.hourly_rate}
            onChange={(e) => set("hourly_rate", e.target.value)}
            placeholder="380"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-28 shrink-0">
          <Label htmlFor="norm-currency" className="text-sm font-medium">
            {t("form.currency_label")}
          </Label>
          <Select
            value={form.currency}
            onValueChange={(v) => set("currency", v as typeof form.currency)}
          >
            <SelectTrigger id="norm-currency" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
