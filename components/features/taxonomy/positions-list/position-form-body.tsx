"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  FUNCTIONAL_ROLES,
  functionalRoleTKey,
  type PositionFormState,
  type TFn,
} from "./_shared";

interface PositionFormBodyProps {
  form: PositionFormState;
  onChange: (next: PositionFormState) => void;
  editingEmployeesCount: number;
  roleChanged: boolean;
  roleChangeAcknowledged: boolean;
  onAckChange: (v: boolean) => void;
  t: TFn;
  tRole: TFn;
}

export function PositionFormBody({
  form,
  onChange,
  editingEmployeesCount,
  roleChanged,
  roleChangeAcknowledged,
  onAckChange,
  t,
  tRole,
}: PositionFormBodyProps) {
  const set = <K extends keyof PositionFormState>(
    key: K,
    value: PositionFormState[K]
  ) => onChange({ ...form, [key]: value });

  return (
    <div className="flex flex-col gap-4">
      {/* Code */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-code" className="text-sm font-medium">
          {t("dialogs.fields.code")}
        </Label>
        <Input
          id="pos-code"
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
          placeholder={t("dialogs.fields.code_placeholder")}
          className="font-mono uppercase"
          maxLength={40}
        />
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-name" className="text-sm font-medium">
          {t("dialogs.fields.name")}
          <span className="ml-1 text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="pos-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("dialogs.fields.name_placeholder")}
          maxLength={80}
          required
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-description" className="text-sm font-medium">
          {t("dialogs.fields.description")}
          <span className="ml-2 text-xs font-normal text-muted-foreground">(необязательно)</span>
        </Label>
        <Textarea
          id="pos-description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder={t("dialogs.fields.description_placeholder")}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* DB Role */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">{t("dialogs.fields.role_id")}</Label>
        <RadioGroup
          value={form.role_id}
          onValueChange={(v) => set("role_id", v as "1" | "2")}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="1" id="role-worker" />
            <Label htmlFor="role-worker" className="text-sm font-normal cursor-pointer">
              {t("dialogs.fields.role_id_worker")}
            </Label>
          </div>
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="2" id="role-manager" />
            <Label htmlFor="role-manager" className="text-sm font-normal cursor-pointer">
              {t("dialogs.fields.role_id_manager")}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Role change warning */}
      {roleChanged && editingEmployeesCount > 0 && (
        <Alert className="border-warning/40 bg-warning/5">
          <AlertDescription className="flex flex-col gap-2 text-sm">
            <span>
              {t("dialogs.role_change_warning", { count: editingEmployeesCount })}
            </span>
            <div className="flex items-center gap-2 min-h-[44px]">
              <Checkbox
                id="role-change-ack"
                checked={roleChangeAcknowledged}
                onCheckedChange={(v) => onAckChange(!!v)}
                className="size-5"
              />
              <Label
                htmlFor="role-change-ack"
                className="text-sm font-normal cursor-pointer leading-relaxed"
              >
                {t("dialogs.role_change_ack")}
              </Label>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Functional role default */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-functional-role" className="text-sm font-medium">
          {t("dialogs.fields.functional_role_default")}
        </Label>
        <Select
          value={form.functional_role_default}
          onValueChange={(v) => set("functional_role_default", v)}
        >
          <SelectTrigger id="pos-functional-role" className="h-9">
            <SelectValue placeholder={t("dialogs.fields.functional_role_default_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              {t("dialogs.fields.functional_role_default_placeholder")}
            </SelectItem>
            {FUNCTIONAL_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {tRole(functionalRoleTKey(role))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("dialogs.fields.functional_role_default_hint")}
        </p>
      </div>

      {/* Default rank */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pos-rank" className="text-sm font-medium">
          {t("dialogs.fields.default_rank")}
        </Label>
        <Input
          id="pos-rank"
          type="number"
          min={1}
          max={6}
          value={form.default_rank}
          onChange={(e) => set("default_rank", e.target.value)}
          placeholder={t("dialogs.fields.default_rank_placeholder")}
          className="w-28"
        />
      </div>

      {/* Is active switch */}
      <div className="flex items-center gap-3 min-h-[44px]">
        <Switch
          id="pos-active"
          checked={form.is_active}
          onCheckedChange={(v) => set("is_active", v)}
        />
        <Label htmlFor="pos-active" className="text-sm font-normal cursor-pointer">
          {t("dialogs.fields.is_active")}
        </Label>
      </div>
    </div>
  );
}
