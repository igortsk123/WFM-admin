"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  MOCK_STORE_OPTIONS,
  MOCK_WORK_TYPE_OPTIONS,
  type MappingRow,
  type Translator,
} from "./_shared";

// ═══════════════════════════════════════════════════════════════════
// FIELD MAPPING SECTION (collapsible)
// ═══════════════════════════════════════════════════════════════════

export function FieldMappingSection({
  rows,
  onChange,
  t,
}: {
  rows: MappingRow[];
  onChange: (rows: MappingRow[]) => void;
  t: Translator;
}) {
  const [open, setOpen] = React.useState(false);

  function updateRow(id: string, field: keyof MappingRow, val: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  }

  function addRow() {
    onChange([
      ...rows,
      { id: `row-${Date.now()}`, key: "", storeValue: "", workTypeValue: "" },
    ]);
    setOpen(true);
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors min-h-[44px]"
        >
          <span>{t("sheet.mapping_title")}</span>
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-3 rounded-md border bg-muted/20 p-3">
          {/* Store mapping */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("sheet.mapping_store_label")}</Label>
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2"
              >
                <Input
                  value={row.key}
                  onChange={(e) => updateRow(row.id, "key", e.target.value)}
                  placeholder={t("sheet.mapping_key_placeholder")}
                  className="flex-1 min-h-[44px] text-sm font-mono"
                />
                <span className="hidden text-muted-foreground sm:block">→</span>
                <Select
                  value={row.storeValue}
                  onValueChange={(v) => updateRow(row.id, "storeValue", v)}
                >
                  <SelectTrigger className="flex-1 min-h-[44px]">
                    <SelectValue placeholder={t("sheet.mapping_value_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_STORE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Remove"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Work type mapping */}
          <div className="space-y-1.5 border-t border-border pt-3">
            <Label className="text-xs text-muted-foreground">{t("sheet.mapping_work_type_label")}</Label>
            {rows.map((row) => (
              <div
                key={`wt-${row.id}`}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2"
              >
                <Input
                  value={row.key}
                  readOnly
                  className="flex-1 min-h-[44px] text-sm font-mono bg-muted/50"
                  placeholder={t("sheet.mapping_key_placeholder")}
                />
                <span className="hidden text-muted-foreground sm:block">→</span>
                <Select
                  value={row.workTypeValue}
                  onValueChange={(v) => updateRow(row.id, "workTypeValue", v)}
                >
                  <SelectTrigger className="flex-1 min-h-[44px]">
                    <SelectValue placeholder={t("sheet.mapping_value_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_WORK_TYPE_OPTIONS.map((wt) => (
                      <SelectItem key={wt.value} value={wt.value}>
                        {wt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="size-9 shrink-0" />
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 min-h-[44px] w-full text-sm"
            onClick={addRow}
          >
            <Plus className="size-3.5" />
            {t("sheet.mapping_add")}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
