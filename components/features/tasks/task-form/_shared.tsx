"use client";

import { useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";

import type {
  Store,
  Zone,
  WorkType,
  ProductCategory,
  User,
  AcceptancePolicy,
  Goal,
  DataConnector,
} from "@/lib/types";

// ─── Zod schema ────────────────────────────────────────────────────

export const TaskFormSchema = z
  .object({
    title: z.string().min(3, "Минимум 3 символа").max(120),
    description: z.string().max(1000).optional(),
    type: z.enum(["PLANNED", "BONUS"]),
    store_id: z.string().min(1, "Обязательное поле"),
    zone_id: z.string().min(1, "Обязательное поле"),
    work_type_id: z.string().min(1, "Обязательное поле"),
    product_category_id: z.string().optional(),
    assignment_type: z.enum(["specific", "permission"]),
    assignee_id: z.string().optional(),
    assigned_to_permission: z.string().optional(),
    is_chain: z.boolean(),
    next_assignment_type: z.enum(["specific", "permission"]).optional(),
    next_assignee_id: z.string().optional(),
    next_permission: z.string().optional(),
    planned_minutes: z.number().int().min(1).max(960),
    scheduled_at_date: z.date().optional(),
    scheduled_at_time: z.string().optional(),
    due_at_date: z.date().optional(),
    due_at_time: z.string().optional(),
    acceptance_policy: z.enum(["AUTO", "MANUAL"]),
    requires_photo: z.boolean(),
    override_enabled: z.boolean(),
    override_justification: z.string().optional(),
    manager_comment: z.string().optional(),
    marketing_channel_id: z.string().optional(),
  })
  .refine(
    (d) => !(d.assignment_type === "specific" && !d.assignee_id),
    { message: "Выберите исполнителя", path: ["assignee_id"] }
  )
  .refine(
    (d) => !(d.assignment_type === "permission" && !d.assigned_to_permission),
    { message: "Выберите привилегию", path: ["assigned_to_permission"] }
  )
  .refine(
    (d) => !(d.is_chain && d.next_assignment_type === "specific" && !d.next_assignee_id),
    { message: "Выберите следующего исполнителя", path: ["next_assignee_id"] }
  )
  .refine(
    (d) => !(d.is_chain && d.next_assignment_type === "permission" && !d.next_permission),
    { message: "Выберите привилегию", path: ["next_permission"] }
  )
  .refine(
    (d) => !(d.override_enabled && (!d.override_justification || d.override_justification.length < 10)),
    { message: "Минимум 10 символов", path: ["override_justification"] }
  )
  .refine(
    (d) => !(d.scheduled_at_date && d.due_at_date && d.due_at_date < d.scheduled_at_date),
    { message: "Дедлайн должен быть позже запланированного времени", path: ["due_at_date"] }
  );

export type TaskFormValues = z.infer<typeof TaskFormSchema>;

// ─── Form data types ────────────────────────────────────────────────

export interface FormData {
  stores: Store[];
  zones: Zone[];
  workTypes: WorkType[];
  productCategories: ProductCategory[];
  workers: User[];
  activeGoals: Goal[];
  marketingChannels: DataConnector[];
}

// ─── Templates ──────────────────────────────────────────────────────

export interface TaskTemplate {
  key: string;
  work_type_id?: string;
  planned_minutes: number;
  requires_photo: boolean;
  acceptance_policy: AcceptancePolicy;
  description?: string;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    key: "merch",
    work_type_id: "4",
    planned_minutes: 30,
    requires_photo: true,
    acceptance_policy: "MANUAL",
    description: "Выкладка товара на полки согласно планограмме",
  },
  {
    key: "revaluation",
    work_type_id: "6",
    planned_minutes: 45,
    requires_photo: true,
    acceptance_policy: "MANUAL",
    description: "Обновление ценников по актуальному прайс-листу",
  },
  {
    key: "cashier_clean",
    work_type_id: "2",
    planned_minutes: 15,
    requires_photo: false,
    acceptance_policy: "AUTO",
    description: "Уборка и дезинфекция кассовой зоны",
  },
  {
    key: "receiving",
    work_type_id: "8",
    planned_minutes: 60,
    requires_photo: true,
    acceptance_policy: "MANUAL",
    description: "Приёмка и разгрузка товара от поставщика",
  },
  {
    key: "inventory",
    work_type_id: "9",
    planned_minutes: 90,
    requires_photo: false,
    acceptance_policy: "MANUAL",
    description: "Инвентаризация товаров бакалейного отдела",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

export function buildDateTimeString(date?: Date, time?: string): string | undefined {
  if (!date) return undefined;
  const d = format(date, "yyyy-MM-dd");
  const t = time || "00:00";
  return `${d}T${t}:00`;
}

// ─── ComboboxField ──────────────────────────────────────────────────

export function ComboboxField({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; hint?: string }[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-9",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? "Поиск..."} />
          <CommandList>
            <CommandEmpty>{emptyText ?? "Ничего не найдено"}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value === value ? "" : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.hint && (
                    <span className="ml-2 text-xs text-muted-foreground shrink-0">
                      {opt.hint}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── DateTimeField ──────────────────────────────────────────────────

export function DateTimeField({
  date,
  onDateChange,
  time,
  onTimeChange,
  placeholder,
  disabled,
}: {
  date?: Date;
  onDateChange: (d: Date | undefined) => void;
  time?: string;
  onTimeChange: (t: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "flex-1 justify-start font-normal h-9 text-left",
              !date && "text-muted-foreground"
            )}
          >
            {date ? format(date, "d MMM yyyy", { locale: ru }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              onDateChange(d);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={time ?? ""}
        onChange={(e) => onTimeChange(e.target.value)}
        disabled={disabled || !date}
        className="w-28 h-9"
      />
    </div>
  );
}
